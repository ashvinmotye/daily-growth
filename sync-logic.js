export const DAILY_GROWTH_STORE_KEYS = Object.freeze({
  packs: "id",
  lessons: "id",
  progress: "lessonId",
  reflections: "lessonId",
  settings: "key",
});

export const DAILY_GROWTH_STORE_NAMES = Object.freeze(Object.keys(DAILY_GROWTH_STORE_KEYS));

export function recordIdFor(storeName, payload) {
  const key = DAILY_GROWTH_STORE_KEYS[storeName];
  if (!key || !payload || payload[key] === undefined || payload[key] === null) return "";
  return String(payload[key]);
}

export function snapshotToCloudRecords(snapshot, clientUpdatedAt = new Date().toISOString()) {
  return DAILY_GROWTH_STORE_NAMES.flatMap((storeName) => {
    const records = Array.isArray(snapshot?.[storeName]) ? snapshot[storeName] : [];
    return records.map((payload) => ({
      storeName,
      recordId: recordIdFor(storeName, payload),
      payload,
      deleted: false,
      clientUpdatedAt,
    })).filter((record) => record.recordId);
  });
}

export function cloudRecordKey(record) {
  return `${record.storeName}:${record.recordId}`;
}

export function mergeInitialPayload(storeName, localPayload, cloudPayload) {
  if (!localPayload) return cloudPayload;
  if (!cloudPayload) return localPayload;

  if (storeName === "progress") {
    const merged = { ...localPayload, ...cloudPayload };
    if (!cloudPayload.completedAt && localPayload.completedAt) merged.completedAt = localPayload.completedAt;
    if (!("actionNote" in cloudPayload) && "actionNote" in localPayload) merged.actionNote = localPayload.actionNote;
    if (!("actionCompletedAt" in cloudPayload) && "actionCompletedAt" in localPayload) {
      merged.actionCompletedAt = localPayload.actionCompletedAt;
    }
    if (!("recallRating" in cloudPayload) && "recallRating" in localPayload) merged.recallRating = localPayload.recallRating;
    if (!("recallRatedAt" in cloudPayload) && "recallRatedAt" in localPayload) merged.recallRatedAt = localPayload.recallRatedAt;
    if (!("articleRating" in cloudPayload) && "articleRating" in localPayload) merged.articleRating = localPayload.articleRating;
    if (!("articleRatedAt" in cloudPayload) && "articleRatedAt" in localPayload) merged.articleRatedAt = localPayload.articleRatedAt;
    return merged;
  }

  if (storeName === "reflections") {
    return cloudPayload.text?.trim() ? cloudPayload : localPayload;
  }

  return cloudPayload;
}

export function mergeQueuedOperations(existingOperations, incomingOperations) {
  const merged = new Map();
  (Array.isArray(existingOperations) ? existingOperations : []).forEach((record) => {
    if (record?.storeName && record?.recordId) merged.set(cloudRecordKey(record), record);
  });
  (Array.isArray(incomingOperations) ? incomingOperations : []).forEach((record) => {
    if (record?.storeName && record?.recordId) merged.set(cloudRecordKey(record), record);
  });
  return [...merged.values()];
}
