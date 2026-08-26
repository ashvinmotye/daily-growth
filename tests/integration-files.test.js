import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the page loads the shared Supabase client before the Daily Growth module", async () => {
  const html = await read("index.html");
  const sdkIndex = html.indexOf("@supabase/supabase-js@2.112.3");
  const appIndex = html.indexOf('type="module" src="./app.js"');

  assert.ok(html.includes('id="auth-screen"'));
  assert.ok(html.includes('id="app-shell" class="app-shell" hidden'));
  assert.ok(sdkIndex > 0 && appIndex > sdkIndex);
});

test("cloud configuration matches the current Forge and Level90 project", async () => {
  const cloud = await read("cloud.js");
  assert.ok(cloud.includes("https://xacwgipxqujbqvhzogbd.supabase.co"));
  assert.ok(cloud.includes("sb_publishable_-_rGsscYv3ipNd7hW23-RQ_bUCB9hTf"));
  assert.ok(cloud.includes('auth.signInWithPassword'));
});

test("the service worker caches sync modules and never caches Supabase API responses", async () => {
  const worker = await read("sw.js");
  assert.ok(worker.includes('"./cloud.js"'));
  assert.ok(worker.includes('"./sync-logic.js"'));
  assert.ok(worker.includes('"./explore-articles.js"'));
  assert.ok(worker.includes('"./explore-briefs.js"'));
  assert.ok(worker.includes('hostname.endsWith(".supabase.co")'));
});

test("the database migration enables owner-only Row Level Security", async () => {
  const sql = await read("supabase/migrations/20260826_create_daily_growth_sync.sql");
  assert.ok(sql.includes("alter table public.daily_growth_records enable row level security"));
  assert.ok(sql.includes("auth.uid() = user_id"));
  assert.ok(sql.includes("daily_growth_keep_newest_record_trigger"));
});
