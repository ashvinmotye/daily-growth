import { applyCloudRecords, getSnapshot } from "./db.js";
import {
  cloudRecordKey,
  mergeInitialPayload,
  mergeQueuedOperations,
  snapshotToCloudRecords,
} from "./sync-logic.js";

const DAILY_GROWTH_SUPABASE_URL = "https://xacwgipxqujbqvhzogbd.supabase.co";
const DAILY_GROWTH_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-_rGsscYv3ipNd7hW23-RQ_bUCB9hTf";
const DAILY_GROWTH_TABLE = "daily_growth_records";
const AUTH_USER_KEY = "dailyGrowth.authUser.v1";
const QUEUE_PREFIX = "dailyGrowth.syncQueue.v1";
const MIGRATION_PREFIX = "dailyGrowth.cloudMigration.v1";
const RECOVERY_PREFIX = "dailyGrowth.beforeCloudMerge.v1";
const LAST_SYNC_PREFIX = "dailyGrowth.lastSync.v1";

const cloudState = {
  signedIn: false,
  email: "",
  connection: "Checking",
  status: "Preparing cloud sync…",
  tone: "waiting",
  busy: false,
  lastSyncAt: "",
};

let authClient = null;
let authSession = null;
let activeUser = null;
let authMode = "signin";
let initialized = false;
let syncInProgress = false;
let syncRequested = false;
let syncTimer = null;

function safeJsonParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function cachedUser() {
  return safeJsonParse(localStorage.getItem(AUTH_USER_KEY));
}

function cacheUser(user) {
  if (!user?.id) return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: user.id, email: user.email || "" }));
}

function currentUserId() {
  return authSession?.user?.id || activeUser?.id || cachedUser()?.id || "";
}

function userStorageKey(prefix, userId = currentUserId()) {
  return userId ? `${prefix}.${userId}` : "";
}

function queueKey(userId = currentUserId()) {
  return userStorageKey(QUEUE_PREFIX, userId);
}

function migrationKey(userId = currentUserId()) {
  return userStorageKey(MIGRATION_PREFIX, userId);
}

function emitCloudState() {
  window.dispatchEvent(new CustomEvent("daily-growth:cloud-state", { detail: getDailyGrowthCloudState() }));
}

function setCloudStatus(status, tone = "", connection = null) {
  cloudState.status = status;
  cloudState.tone = tone;
  if (connection) cloudState.connection = connection;
  emitCloudState();
}

function setCloudBusy(busy) {
  cloudState.busy = busy;
  emitCloudState();
}

function authElements() {
  return {
    appShell: document.querySelector("#app-shell"),
    authScreen: document.querySelector("#auth-screen"),
    authLoading: document.querySelector("#auth-loading"),
    authFormContent: document.querySelector("#auth-form-content"),
    authForm: document.querySelector("#auth-form"),
    authEmail: document.querySelector("#auth-email"),
    authPassword: document.querySelector("#auth-password"),
    authPasswordHelp: document.querySelector("#auth-password-help"),
    authSubmit: document.querySelector("#auth-submit"),
    authMessage: document.querySelector("#auth-message"),
    signInMode: document.querySelector("#sign-in-mode"),
    signUpMode: document.querySelector("#sign-up-mode"),
  };
}

function setAuthMessage(message = "", tone = "") {
  const { authMessage } = authElements();
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.classList.toggle("is-error", tone === "error");
  authMessage.classList.toggle("is-success", tone === "success");
}

function setAuthMode(mode, clearMessage = true) {
  authMode = mode === "signup" ? "signup" : "signin";
  const signingUp = authMode === "signup";
  const elements = authElements();
  elements.signInMode?.classList.toggle("is-active", !signingUp);
  elements.signUpMode?.classList.toggle("is-active", signingUp);
  elements.signInMode?.setAttribute("aria-pressed", String(!signingUp));
  elements.signUpMode?.setAttribute("aria-pressed", String(signingUp));
  if (elements.authSubmit) elements.authSubmit.textContent = signingUp ? "Create account" : "Sign in";
  if (elements.authPassword) elements.authPassword.autocomplete = signingUp ? "new-password" : "current-password";
  if (elements.authPasswordHelp) {
    elements.authPasswordHelp.textContent = signingUp
      ? "Use at least 6 characters. You may need to confirm your email."
      : "Use the same account as Forge and Level90.";
  }
  if (clearMessage) setAuthMessage();
}

function setAuthBusy(busy) {
  const elements = authElements();
  [elements.authEmail, elements.authPassword, elements.signInMode, elements.signUpMode, elements.authSubmit]
    .filter(Boolean).forEach((element) => { element.disabled = busy; });
  if (elements.authSubmit) {
    elements.authSubmit.textContent = busy
      ? (authMode === "signup" ? "Creating account…" : "Signing in…")
      : (authMode === "signup" ? "Create account" : "Sign in");
  }
}

function friendlyAuthError(error) {
  const message = String(error?.message || "").trim();
  const normalized = message.toLowerCase();
  if (!navigator.onLine || normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "You appear to be offline. Connect and try again.";
  }
  if (normalized.includes("invalid login credentials")) return "The email or password is incorrect.";
  if (normalized.includes("email not confirmed")) return "Confirm your email, then sign in again.";
  return message || "Daily Growth could not sign you in.";
}

function friendlySyncError(error) {
  const message = String(error?.message || "").trim();
  const normalized = message.toLowerCase();
  if (!navigator.onLine || normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "Waiting for an internet connection";
  }
  if (normalized.includes(DAILY_GROWTH_TABLE) && (normalized.includes("does not exist") || normalized.includes("schema cache") || normalized.includes("relation"))) {
    return "Run the included Daily Growth Supabase migration";
  }
  if (normalized.includes("row-level security")) return "Sync was blocked by the database security policy";
  return message ? `Sync failed: ${message}` : "Daily Growth could not be synced";
}

function showAuthLoading(message = "Checking your account…") {
  const elements = authElements();
  if (elements.appShell) elements.appShell.hidden = true;
  if (elements.authScreen) elements.authScreen.hidden = false;
  if (elements.authLoading) {
    elements.authLoading.hidden = false;
    const copy = elements.authLoading.querySelector("p");
    if (copy) copy.textContent = message;
  }
  if (elements.authFormContent) elements.authFormContent.hidden = true;
}

function showAuthForm(message = "", tone = "") {
  const elements = authElements();
  if (elements.appShell) elements.appShell.hidden = true;
  if (elements.authScreen) elements.authScreen.hidden = false;
  if (elements.authLoading) elements.authLoading.hidden = true;
  if (elements.authFormContent) elements.authFormContent.hidden = false;
  setAuthMessage(message, tone);
}

function revealApp(user, offline = false) {
  const elements = authElements();
  if (elements.appShell) elements.appShell.hidden = false;
  if (elements.authScreen) elements.authScreen.hidden = true;
  activeUser = user;
  cloudState.signedIn = Boolean(user?.id);
  cloudState.email = user?.email || "";
  cloudState.connection = offline || !navigator.onLine || !authSession ? "Offline access" : "Connected";
  emitCloudState();
}

function readQueue(userId = currentUserId()) {
  const key = queueKey(userId);
  const queue = key ? safeJsonParse(localStorage.getItem(key), []) : [];
  return Array.isArray(queue) ? queue : [];
}

function writeQueue(records, userId = currentUserId()) {
  const key = queueKey(userId);
  if (!key) return;
  if (records.length) localStorage.setItem(key, JSON.stringify(records));
  else localStorage.removeItem(key);
}

function queueLocalOperations(operations) {
  const userId = currentUserId();
  if (!userId || !Array.isArray(operations) || !operations.length) return;
  const clientUpdatedAt = new Date().toISOString();
  const stamped = operations.map((record) => ({ ...record, clientUpdatedAt }));
  writeQueue(mergeQueuedOperations(readQueue(userId), stamped), userId);
  setCloudStatus(navigator.onLine && authSession ? "Saving changes…" : "Offline • changes queued", "waiting");
  scheduleSync();
}

function removeSentQueueRecords(sent, userId) {
  const sentByKey = new Map(sent.map((record) => [cloudRecordKey(record), record.clientUpdatedAt]));
  const remaining = readQueue(userId).filter((record) => sentByKey.get(cloudRecordKey(record)) !== record.clientUpdatedAt);
  writeQueue(remaining, userId);
}

function toDatabaseRow(record, userId) {
  return {
    user_id: userId,
    store_name: record.storeName,
    record_id: record.recordId,
    payload: record.deleted ? null : record.payload,
    deleted: Boolean(record.deleted),
    client_updated_at: record.clientUpdatedAt || new Date().toISOString(),
  };
}

function fromDatabaseRow(row) {
  return {
    storeName: row.store_name,
    recordId: row.record_id,
    payload: row.payload,
    deleted: Boolean(row.deleted),
    clientUpdatedAt: row.client_updated_at,
    serverUpdatedAt: row.updated_at,
  };
}

async function pushRecords(records, userId) {
  const valid = records.filter((record) => record?.storeName && record?.recordId);
  for (let index = 0; index < valid.length; index += 100) {
    const rows = valid.slice(index, index + 100).map((record) => toDatabaseRow(record, userId));
    const { error } = await authClient.from(DAILY_GROWTH_TABLE).upsert(rows, {
      onConflict: "user_id,store_name,record_id",
    });
    if (error) throw error;
  }
}

async function fetchCloudRecords(userId) {
  const { data, error } = await authClient
    .from(DAILY_GROWTH_TABLE)
    .select("store_name,record_id,payload,deleted,client_updated_at,updated_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map(fromDatabaseRow);
}

async function flushQueue(userId) {
  const queued = readQueue(userId);
  if (!queued.length) return;
  await pushRecords(queued, userId);
  removeSentQueueRecords(queued, userId);
}

function saveRecoverySnapshot(snapshot, userId) {
  const key = userStorageKey(RECOVERY_PREFIX, userId);
  if (!key || localStorage.getItem(key)) return;
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), ...snapshot }));
  } catch (error) {
    console.warn("Daily Growth could not retain its pre-sync recovery snapshot", error);
  }
}

function payloadsMatch(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

async function runInitialMigration(userId) {
  const snapshot = await getSnapshot();
  saveRecoverySnapshot(snapshot, userId);
  const cloudRecords = await fetchCloudRecords(userId);
  const cloudByKey = new Map(cloudRecords.map((record) => [cloudRecordKey(record), record]));
  const localRecords = snapshotToCloudRecords(snapshot);
  const uploads = [];

  localRecords.forEach((localRecord) => {
    const cloudRecord = cloudByKey.get(cloudRecordKey(localRecord));
    if (!cloudRecord) {
      uploads.push(localRecord);
      return;
    }
    if (cloudRecord.deleted) return;
    const mergedPayload = mergeInitialPayload(localRecord.storeName, localRecord.payload, cloudRecord.payload);
    if (!payloadsMatch(mergedPayload, cloudRecord.payload)) {
      uploads.push({ ...localRecord, payload: mergedPayload, clientUpdatedAt: new Date().toISOString() });
    }
  });

  if (uploads.length) await pushRecords(uploads, userId);
  const key = migrationKey(userId);
  if (key) localStorage.setItem(key, "complete");
  await flushQueue(userId);
}

async function applyLatestCloudRecords(userId) {
  const records = await fetchCloudRecords(userId);
  await applyCloudRecords(records);
  window.dispatchEvent(new CustomEvent("daily-growth:cloud-data"));
}

function scheduleSync(delay = 450) {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => syncDailyGrowthNow(), delay);
}

export async function syncDailyGrowthNow(options = {}) {
  const userId = currentUserId();
  if (!userId || !authClient || !authSession || !navigator.onLine) {
    setCloudStatus("Offline • changes stay on this device", "waiting", "Offline access");
    return false;
  }
  if (syncInProgress) {
    syncRequested = true;
    return false;
  }

  syncInProgress = true;
  setCloudBusy(true);
  setCloudStatus(options.initial ? "Preparing your cloud data…" : "Syncing…", "waiting", "Connected");
  try {
    if (localStorage.getItem(migrationKey(userId)) !== "complete") await runInitialMigration(userId);
    else await flushQueue(userId);
    await applyLatestCloudRecords(userId);
    const syncedAt = new Date().toISOString();
    cloudState.lastSyncAt = syncedAt;
    localStorage.setItem(userStorageKey(LAST_SYNC_PREFIX, userId), syncedAt);
    setCloudStatus("Synced just now", "success", "Connected");
    return true;
  } catch (error) {
    console.error("Daily Growth cloud sync failed", error);
    setCloudStatus(friendlySyncError(error), "error", navigator.onLine ? "Connected" : "Offline access");
    return false;
  } finally {
    syncInProgress = false;
    setCloudBusy(false);
    if (syncRequested) {
      syncRequested = false;
      scheduleSync(150);
    }
  }
}

async function showAuthenticatedApp(session, options = {}) {
  const user = session?.user || options.user;
  if (!user?.id) return;
  authSession = session?.user ? session : null;
  cacheUser(user);
  const offline = Boolean(options.offline || !authSession || !navigator.onLine);
  revealApp(user, offline);
  cloudState.lastSyncAt = localStorage.getItem(userStorageKey(LAST_SYNC_PREFIX, user.id)) || "";
  if (offline) {
    setCloudStatus("Offline • changes stay on this device", "waiting", "Offline access");
    return;
  }
  await syncDailyGrowthNow({ initial: true });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!authClient) return;
  const elements = authElements();
  const email = elements.authEmail?.value.trim() || "";
  const password = elements.authPassword?.value || "";
  if (!email || password.length < 6) {
    setAuthMessage("Enter your email and a password of at least 6 characters.", "error");
    return;
  }

  setAuthBusy(true);
  setAuthMessage();
  try {
    if (authMode === "signup") {
      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: location.href.split("#")[0] },
      });
      if (error) throw error;
      if (data.session?.user) await showAuthenticatedApp(data.session);
      else setAuthMessage("Check your email to confirm the account, then sign in.", "success");
    } else {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session?.user) await showAuthenticatedApp(data.session);
    }
  } catch (error) {
    setAuthMessage(friendlyAuthError(error), "error");
  } finally {
    setAuthBusy(false);
  }
}

async function refreshAuthentication() {
  if (!authClient || !navigator.onLine) return;
  try {
    const { data, error } = await authClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) await showAuthenticatedApp(data.session);
    else showAuthForm();
  } catch (error) {
    setCloudStatus(friendlySyncError(error), "error");
  }
}

function bindCloudEvents() {
  if (initialized) return;
  initialized = true;
  const elements = authElements();
  elements.signInMode?.addEventListener("click", () => setAuthMode("signin"));
  elements.signUpMode?.addEventListener("click", () => setAuthMode("signup"));
  elements.authForm?.addEventListener("submit", handleAuthSubmit);
  window.addEventListener("daily-growth:local-change", (event) => queueLocalOperations(event.detail?.operations));
  window.addEventListener("online", refreshAuthentication);
  window.addEventListener("offline", () => {
    if (activeUser) revealApp(activeUser, true);
    setCloudStatus("Offline • changes stay on this device", "waiting", "Offline access");
  });
  window.addEventListener("focus", () => scheduleSync(100));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(100);
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible") scheduleSync(100);
  }, 60000);
}

export function getDailyGrowthCloudState() {
  return { ...cloudState, queuedChanges: readQueue().length };
}

export async function signOutDailyGrowth() {
  if (!authClient) return;
  setCloudBusy(true);
  try {
    await syncDailyGrowthNow();
    const { error } = await authClient.auth.signOut({ scope: "local" });
    if (error) throw error;
    authSession = null;
    activeUser = null;
    localStorage.removeItem(AUTH_USER_KEY);
    cloudState.signedIn = false;
    cloudState.email = "";
    cloudState.connection = "Signed out";
    setAuthMode("signin", false);
    showAuthForm("Signed out successfully.", "success");
    emitCloudState();
  } catch (error) {
    setCloudStatus(friendlyAuthError(error), "error");
  } finally {
    setCloudBusy(false);
  }
}

export async function initializeDailyGrowthCloud() {
  bindCloudEvents();
  setAuthMode("signin");
  showAuthLoading();

  if (!window.supabase?.createClient) {
    const user = cachedUser();
    if (!navigator.onLine && user) {
      await showAuthenticatedApp(null, { user, offline: true });
      return;
    }
    showAuthForm("The account service could not be loaded. Check your connection and reload.", "error");
    return;
  }

  authClient = window.supabase.createClient(DAILY_GROWTH_SUPABASE_URL, DAILY_GROWTH_SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });

  authClient.auth.onAuthStateChange((event, session) => {
    window.setTimeout(async () => {
      if (session?.user) await showAuthenticatedApp(session);
      else if (event === "SIGNED_OUT") {
        authSession = null;
        activeUser = null;
        localStorage.removeItem(AUTH_USER_KEY);
        showAuthForm();
      }
    }, 0);
  });

  try {
    const { data, error } = await authClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) {
      await showAuthenticatedApp(data.session);
      return;
    }
    const user = cachedUser();
    if (!navigator.onLine && user) await showAuthenticatedApp(null, { user, offline: true });
    else showAuthForm();
  } catch (error) {
    const user = cachedUser();
    if (!navigator.onLine && user) await showAuthenticatedApp(null, { user, offline: true });
    else showAuthForm(friendlyAuthError(error), "error");
  }
}
