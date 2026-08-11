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
}

export async function saveProgress(progress) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.progress, "readwrite");
  transaction.objectStore(STORES.progress).put(progress);
  await transactionDone(transaction);
}

export async function saveReflection(reflection) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.reflections, "readwrite");
  const store = transaction.objectStore(STORES.reflections);

  if (reflection.text.trim()) store.put(reflection);
  else store.delete(reflection.lessonId);

  await transactionDone(transaction);
}

export async function saveSetting(key, value) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.settings, "readwrite");
  transaction.objectStore(STORES.settings).put({ key, value });
  await transactionDone(transaction);
}

export async function removePackContent(packId) {
  const db = await openDatabase();
  const transaction = db.transaction([STORES.packs, STORES.lessons], "readwrite");
  const packStore = transaction.objectStore(STORES.packs);
  const lessonStore = transaction.objectStore(STORES.lessons);
  const index = lessonStore.index("packId");

  packStore.delete(packId);

  await new Promise((resolve, reject) => {
    const cursorRequest = index.openKeyCursor(IDBKeyRange.only(packId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      lessonStore.delete(cursor.primaryKey);
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });

  await transactionDone(transaction);
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
}

export async function clearAllData() {
  const db = await openDatabase();
  const transaction = db.transaction(Object.values(STORES), "readwrite");
  Object.values(STORES).forEach((storeName) => transaction.objectStore(storeName).clear());
  await transactionDone(transaction);
}

export const storeNames = Object.freeze({ ...STORES });
