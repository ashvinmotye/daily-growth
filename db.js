import { DAILY_GROWTH_STORE_KEYS, recordIdFor, snapshotToCloudRecords } from "./sync-logic.js";

const DB_NAME = "daily-growth-db";
const DB_VERSION = 1;

const STORES = {
  packs: "packs",
  lessons: "lessons",
  progress: "progress",
  reflections: "reflections",
  settings: "settings",
};

let dbPromise;

function notifyLocalChanges(operations) {
  if (typeof window === "undefined" || !operations?.length) return;
  window.dispatchEvent(new CustomEvent("daily-growth:local-change", { detail: { operations } }));
}

function upsertOperation(storeName, payload) {
  return {
    storeName,
    recordId: recordIdFor(storeName, payload),
    payload,
    deleted: false,
  };
}

function deleteOperation(storeName, recordId) {
  return { storeName, recordId: String(recordId), payload: null, deleted: true };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Storage transaction was cancelled."));
  });
}

export function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.packs)) {
        db.createObjectStore(STORES.packs, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.lessons)) {
        const lessons = db.createObjectStore(STORES.lessons, { keyPath: "id" });
        lessons.createIndex("packId", "packId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.progress)) {
        db.createObjectStore(STORES.progress, { keyPath: "lessonId" });
      }

      if (!db.objectStoreNames.contains(STORES.reflections)) {
        db.createObjectStore(STORES.reflections, { keyPath: "lessonId" });
      }

      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Please close other Daily Growth tabs and try again."));
  });

  return dbPromise;
}

export async function getSnapshot() {
  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readonly");

  const [packs, lessons, progress, reflections, settings] = await Promise.all([
    requestResult(transaction.objectStore(STORES.packs).getAll()),
    requestResult(transaction.objectStore(STORES.lessons).getAll()),
    requestResult(transaction.objectStore(STORES.progress).getAll()),
    requestResult(transaction.objectStore(STORES.reflections).getAll()),
    requestResult(transaction.objectStore(STORES.settings).getAll()),
  ]);

  await transactionDone(transaction);
  return { packs, lessons, progress, reflections, settings };
}

export async function importContentPack(pack, lessons) {
  const db = await openDatabase();
  const transaction = db.transaction([STORES.packs, STORES.lessons], "readwrite");
  const packStore = transaction.objectStore(STORES.packs);
  const lessonStore = transaction.objectStore(STORES.lessons);

  packStore.put(pack);
  lessons.forEach((lesson) => lessonStore.put(lesson));
  await transactionDone(transaction);
  notifyLocalChanges([
    upsertOperation(STORES.packs, pack),
    ...lessons.map((lesson) => upsertOperation(STORES.lessons, lesson)),
  ]);
}

export async function saveProgress(progress) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.progress, "readwrite");
  transaction.objectStore(STORES.progress).put(progress);
  await transactionDone(transaction);
  notifyLocalChanges([upsertOperation(STORES.progress, progress)]);
}

export async function saveReflection(reflection) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.reflections, "readwrite");
  const store = transaction.objectStore(STORES.reflections);

  const hasText = Boolean(reflection.text.trim());
  if (hasText) store.put(reflection);
  else store.delete(reflection.lessonId);

  await transactionDone(transaction);
  notifyLocalChanges([
    hasText
      ? upsertOperation(STORES.reflections, reflection)
      : deleteOperation(STORES.reflections, reflection.lessonId),
  ]);
}

export async function saveSetting(key, value) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.settings, "readwrite");
  const setting = { key, value };
  transaction.objectStore(STORES.settings).put(setting);
  await transactionDone(transaction);
  notifyLocalChanges([upsertOperation(STORES.settings, setting)]);
}

export async function removePackContent(packId) {
  const db = await openDatabase();
  const transaction = db.transaction([STORES.packs, STORES.lessons], "readwrite");
  const packStore = transaction.objectStore(STORES.packs);
  const lessonStore = transaction.objectStore(STORES.lessons);
  const index = lessonStore.index("packId");
  const removedLessonIds = [];

  packStore.delete(packId);

  await new Promise((resolve, reject) => {
    const cursorRequest = index.openKeyCursor(IDBKeyRange.only(packId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      removedLessonIds.push(String(cursor.primaryKey));
      lessonStore.delete(cursor.primaryKey);
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });

  await transactionDone(transaction);
  notifyLocalChanges([
    deleteOperation(STORES.packs, packId),
    ...removedLessonIds.map((lessonId) => deleteOperation(STORES.lessons, lessonId)),
  ]);
}

export async function mergeBackup(backup) {
  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readwrite");

  backup.packs.forEach((item) => transaction.objectStore(STORES.packs).put(item));
  backup.lessons.forEach((item) => transaction.objectStore(STORES.lessons).put(item));
  backup.progress.forEach((item) => transaction.objectStore(STORES.progress).put(item));
  backup.reflections.forEach((item) => transaction.objectStore(STORES.reflections).put(item));
  backup.settings.forEach((item) => transaction.objectStore(STORES.settings).put(item));

  await transactionDone(transaction);
  notifyLocalChanges(snapshotToCloudRecords(backup));
}

export async function clearAllData() {
  const snapshot = await getSnapshot();
  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readwrite");
  Object.values(STORES).forEach((storeName) => transaction.objectStore(storeName).clear());
  await transactionDone(transaction);
  notifyLocalChanges(snapshotToCloudRecords(snapshot).map((record) => deleteOperation(record.storeName, record.recordId)));
}

export async function applyCloudRecords(records) {
  const validRecords = (Array.isArray(records) ? records : []).filter((record) => {
    return DAILY_GROWTH_STORE_KEYS[record.storeName] && record.recordId;
  });
  if (!validRecords.length) return;

  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readwrite");

  validRecords.forEach((record) => {
    const store = transaction.objectStore(record.storeName);
    if (record.deleted) store.delete(record.recordId);
    else if (record.payload) store.put(record.payload);
  });

  await transactionDone(transaction);
}

export const storeNames = Object.freeze({ ...STORES });
