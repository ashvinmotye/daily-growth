import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeInitialPayload,
  mergeQueuedOperations,
  snapshotToCloudRecords,
} from "../sync-logic.js";

test("snapshot conversion keeps permanent IDs for every IndexedDB store", () => {
  const records = snapshotToCloudRecords({
    packs: [{ id: "pack-1", title: "Pack" }],
    lessons: [{ id: "lesson-1", packId: "pack-1" }],
    progress: [{ lessonId: "lesson-1", completedAt: "2026-08-26T08:00:00.000Z" }],
    reflections: [{ lessonId: "lesson-1", text: "Useful" }],
    settings: [{ key: "theme", value: "dark" }],
  }, "2026-08-26T09:00:00.000Z");

  assert.deepEqual(records.map(({ storeName, recordId }) => [storeName, recordId]), [
    ["packs", "pack-1"],
    ["lessons", "lesson-1"],
    ["progress", "lesson-1"],
    ["reflections", "lesson-1"],
    ["settings", "theme"],
  ]);
});

test("first cloud merge preserves local-only progress fields without replacing cloud edits", () => {
  const local = {
    lessonId: "lesson-1",
    completedAt: "2026-08-20T08:00:00.000Z",
    actionNote: "Local action",
    recallRating: "familiar",
    articleRating: 4,
    articleRatedAt: "2026-08-26T10:00:00.000Z",
  };
  const cloud = {
    lessonId: "lesson-1",
    completedAt: "2026-08-21T08:00:00.000Z",
    actionNote: "Cloud action",
  };

  assert.deepEqual(mergeInitialPayload("progress", local, cloud), {
    lessonId: "lesson-1",
    completedAt: "2026-08-21T08:00:00.000Z",
    actionNote: "Cloud action",
    recallRating: "familiar",
    articleRating: 4,
    articleRatedAt: "2026-08-26T10:00:00.000Z",
  });
});

test("the newest queued operation for a record replaces the older operation", () => {
  const merged = mergeQueuedOperations(
    [{ storeName: "settings", recordId: "theme", payload: { key: "theme", value: "light" }, clientUpdatedAt: "1" }],
    [{ storeName: "settings", recordId: "theme", payload: { key: "theme", value: "dark" }, clientUpdatedAt: "2" }],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].payload.value, "dark");
});
