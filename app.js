import {
  clearAllData,
  getSnapshot,
  importContentPack,
  mergeBackup,
  openDatabase,
  removePackContent,
  saveProgress,
  saveReflection,
  saveSetting,
} from "./db.js";
import {
  EXPLORE_WORLDS,
  allExploreLessons,
  allExploreTerritories,
  exploreLessonsForTerritory,
} from "./explore-catalog.js";

const APP_VERSION = "2.0.1";
const main = document.querySelector("#main-content");
const pageTitle = document.querySelector("#page-title");
const pageEyebrow = document.querySelector("#page-eyebrow");
const xpChip = document.querySelector("#xp-chip");
const sidebarGrowth = document.querySelector("#sidebar-growth");
const contentInput = document.querySelector("#content-file-input");
const backupInput = document.querySelector("#backup-file-input");
const importDialog = document.querySelector("#import-dialog");
const importDialogContent = document.querySelector("#import-dialog-content");
const confirmDialog = document.querySelector("#confirm-dialog");
const confirmMessage = document.querySelector("#confirm-dialog-message");
const confirmAccept = document.querySelector("#confirm-accept");
const toastRegion = document.querySelector("#toast-region");
const quickTheme = document.querySelector("#quick-theme");
const exploreTerritories = allExploreTerritories();
const exploreLessons = allExploreLessons();
const exploreTerritoryById = new Map(exploreTerritories.map((item) => [item.id, item]));
const exploreLessonById = new Map(exploreLessons.map((item) => [item.id, item]));

const state = {
  packs: [],
  lessons: [],
  progress: [],
  reflections: [],
  settings: [],
};

const ui = {
  view: "today",
  selectedLessonId: null,
  journeyPack: "all",
  journeySearch: "",
  exploreWorldId: "",
  exploreTerritoryId: "",
  exploreDayIndex: 0,
  exploreSuggestionReason: "",
  pendingImport: null,
  pendingBackup: null,
  confirmAction: null,
};

const VIEW_META = {
  today: ["Today", "Your daily practice"],
  journey: ["Journey", "Every step, at your pace"],
  explore: ["Explore", "Go beyond the familiar"],
  journal: ["Journal", "Thoughts worth returning to"],
  insights: ["Insights", "Notice how you are growing"],
  settings: ["Settings", "Make Daily Growth yours"],
};

const DEFAULT_SETTINGS = {
  theme: "system",
  fontScale: "medium",
  activePackId: "",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value);
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function getSetting(key) {
  return state.settings.find((setting) => setting.key === key)?.value ?? DEFAULT_SETTINGS[key];
}

function progressMap() {
  return new Map(state.progress.map((item) => [item.lessonId, item]));
}

function reflectionMap() {
  return new Map(state.reflections.map((item) => [item.lessonId, item]));
}

function packMap() {
  return new Map(state.packs.map((item) => [item.id, item]));
}

function orderedPacks() {
  return [...state.packs].sort((a, b) => {
    const position = (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);
    if (position) return position;
    return String(a.importedAt).localeCompare(String(b.importedAt));
  });
}

function orderedLessons() {
  const packPosition = new Map(orderedPacks().map((pack, index) => [pack.id, index]));
  return [...state.lessons].sort((a, b) => {
    const packDifference = (packPosition.get(a.packId) ?? 9999) - (packPosition.get(b.packId) ?? 9999);
    if (packDifference) return packDifference;
    return a.order - b.order || a.id.localeCompare(b.id);
  });
}

function lessonsForPack(packId) {
  return orderedLessons().filter((lesson) => lesson.packId === packId);
}

function arraySetting(key) {
  const value = getSetting(key);
  return Array.isArray(value) ? value : [];
}

function startedTerritoryIds() {
  const started = new Set(arraySetting("explore:startedTerritories"));
  state.progress.forEach((item) => {
    const lesson = exploreLessonById.get(item.lessonId);
    if (lesson) started.add(lesson.territoryId);
  });
  state.reflections.forEach((item) => {
    const lesson = exploreLessonById.get(item.lessonId);
    if (lesson?.territoryId && item.text?.trim()) started.add(lesson.territoryId);
  });
  return started;
}

function allKnownLessons() {
  return [...orderedLessons(), ...exploreLessons];
}

function activeLearningLessons() {
  const started = startedTerritoryIds();
  return [...orderedLessons(), ...exploreLessons.filter((lesson) => started.has(lesson.territoryId))];
}

function findLesson(lessonId) {
  return state.lessons.find((item) => item.id === lessonId) || exploreLessonById.get(lessonId) || null;
}

function territoryStats(territoryId) {
  const lessons = exploreLessonsForTerritory(exploreTerritoryById.get(territoryId));
  const progress = progressMap();
  const completed = lessons.filter((lesson) => progress.get(lesson.id)?.completedAt).length;
  const ratings = lessons
    .map((lesson) => progress.get(lesson.id)?.recallRating)
    .filter((rating) => ["revisit", "familiar", "remembered"].includes(rating));
  const ratingValue = { revisit: 30, familiar: 65, remembered: 100 };
  const retention = ratings.length
    ? Math.round(ratings.reduce((sum, rating) => sum + ratingValue[rating], 0) / ratings.length)
    : null;
  const currentIndex = lessons.findIndex((lesson) => !progress.get(lesson.id)?.completedAt);
  return {
    lessons,
    completed,
    percent: Math.round((completed / lessons.length) * 100),
    currentIndex: currentIndex >= 0 ? currentIndex : lessons.length - 1,
    finished: completed === lessons.length,
    retention,
    ratingCount: ratings.length,
  };
}

function exploreAnalytics() {
  const started = startedTerritoryIds();
  const startedTerritories = exploreTerritories.filter((territory) => started.has(territory.id));
  const worldsStarted = new Set(startedTerritories.map((territory) => territory.worldId));
  const completedTerritories = startedTerritories.filter((territory) => territoryStats(territory.id).finished);
  const rated = startedTerritories.flatMap((territory) => territoryStats(territory.id).lessons)
    .map((lesson) => progressMap().get(lesson.id)?.recallRating)
    .filter((rating) => ["revisit", "familiar", "remembered"].includes(rating));
  const ratingValue = { revisit: 30, familiar: 65, remembered: 100 };
  const retention = rated.length
    ? Math.round(rated.reduce((sum, rating) => sum + ratingValue[rating], 0) / rated.length)
    : null;
  return {
    started,
    startedTerritories,
    worldsStarted,
    completedTerritories,
    breadthPercent: Math.round((worldsStarted.size / EXPLORE_WORLDS.length) * 100),
    retention,
    ratedCount: rated.length,
  };
}

function stableDailyNumber(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function chooseSomewhereNew() {
  const analytics = exploreAnalytics();
  const recent = arraySetting("explore:recentTerritories").slice(-8);
  const worldStartedCount = new Map(EXPLORE_WORLDS.map((world) => [
    world.id,
    world.territories.filter(([territoryId]) => analytics.started.has(territoryId)).length,
  ]));
  const candidates = exploreTerritories.map((territory) => {
    const stats = territoryStats(territory.id);
    const recentIndex = recent.lastIndexOf(territory.id);
    const recencyPenalty = recentIndex >= 0 ? 240 + recentIndex * 10 : 0;
    const familiarityPenalty = (stats.retention ?? 0) * 0.7 + stats.completed * 14;
    const novelty = analytics.started.has(territory.id) ? 0 : 150;
    const breadth = 120 - (worldStartedCount.get(territory.worldId) || 0) * 24;
    const dailyTieBreak = stableDailyNumber(`${localDateKey()}:${territory.id}`) * 12;
    return { territory, score: novelty + breadth + dailyTieBreak - recencyPenalty - familiarityPenalty };
  }).sort((a, b) => b.score - a.score);
  const territory = candidates[0].territory;
  const worldCount = worldStartedCount.get(territory.worldId) || 0;
  const reason = worldCount === 0
    ? `This opens an unvisited World: ${territory.worldTitle}.`
    : analytics.started.has(territory.id)
      ? `This returns to a less-familiar territory outside your recent rotation.`
      : `This expands a lightly explored part of ${territory.worldTitle}.`;
  return { territory, reason };
}

async function recordExploreTerritory(territoryId) {
  const started = [...new Set([...arraySetting("explore:startedTerritories"), territoryId])];
  const recent = arraySetting("explore:recentTerritories").filter((id) => id !== territoryId);
  recent.push(territoryId);
  await saveSetting("explore:startedTerritories", started);
  await saveSetting("explore:recentTerritories", recent.slice(-12));
  await saveSetting("explore:activeTerritoryId", territoryId);
}

function getActivePackId() {
  const packs = orderedPacks();
  const savedPackId = getSetting("activePackId");
  return packs.some((pack) => pack.id === savedPackId) ? savedPackId : packs[0]?.id || "";
}

function packCursorKey(packId) {
  return `packCursor:${packId}`;
}

function getPackCursorIndex(lessons, packId) {
  if (!lessons.length) return -1;

  const savedLessonId = getSetting(packCursorKey(packId));
  const savedIndex = lessons.findIndex((lesson) => lesson.id === savedLessonId);
  if (savedIndex >= 0) return savedIndex;

  const firstIncomplete = lessons.findIndex((lesson) => !progressMap().get(lesson.id)?.completedAt);
  return firstIncomplete >= 0 ? firstIncomplete : lessons.length - 1;
}

async function rememberLesson(lessonId) {
  const lesson = state.lessons.find((item) => item.id === lessonId);
  if (!lesson) return null;

  await saveSetting("activePackId", lesson.packId);
  await saveSetting(packCursorKey(lesson.packId), lesson.id);
  await refreshState();
  ui.selectedLessonId = lesson.id;
  return lesson;
}

async function selectActivePack(packId) {
  const pack = state.packs.find((item) => item.id === packId);
  if (!pack) return null;

  const lessons = lessonsForPack(pack.id);
  const cursorLesson = lessons[getPackCursorIndex(lessons, pack.id)];
  await saveSetting("activePackId", pack.id);
  if (cursorLesson) await saveSetting(packCursorKey(pack.id), cursorLesson.id);
  await refreshState();
  ui.selectedLessonId = null;
  return pack;
}

function calculateStats(lessons = activeLearningLessons()) {
  const progress = progressMap();
  const reflections = reflectionMap();
  const completed = lessons.filter((lesson) => progress.get(lesson.id)?.completedAt);
  const actionCount = lessons.filter((lesson) => progress.get(lesson.id)?.actionCompletedAt).length;
  const reflectionCount = lessons.filter((lesson) => reflections.get(lesson.id)?.text?.trim()).length;
  const xp = completed.length * 10 + actionCount * 10 + reflectionCount * 5;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const completionPercent = lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0;

  const completionDays = new Set(completed.map((item) => localDateKey(new Date(progress.get(item.id).completedAt))));
  let streak = 0;
  let cursor = new Date();
  if (!completionDays.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (completionDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    total: lessons.length,
    completed: completed.length,
    actionCount,
    reflectionCount,
    xp,
    level,
    levelProgress,
    completionPercent,
    streak,
    completionDays,
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function contentFingerprint(lesson) {
  return JSON.stringify({
    packId: lesson.packId,
    order: lesson.order,
    title: lesson.title,
    summary: lesson.summary,
    whyItMatters: lesson.whyItMatters,
    example: lesson.example,
    action: lesson.action,
    reflection: lesson.reflection,
    tags: lesson.tags,
  });
}

function validateContentPack(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { errors: ["The file must contain one JSON object."], pack: null, lessons: [] };
  }
  if (payload.type === "daily-growth-backup") {
    return { errors: ["This is a backup file. Use ‘Restore backup’ in Settings instead."], pack: null, lessons: [] };
  }
  if (payload.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!payload.pack || typeof payload.pack !== "object") errors.push("A pack object is required.");
  if (!Array.isArray(payload.lessons) || !payload.lessons.length) errors.push("The pack must contain at least one lesson.");

  const rawPack = payload.pack || {};
  const idPattern = /^[a-z0-9][a-z0-9._-]{2,79}$/i;
  const packId = normalizeText(rawPack.id);
  if (!idPattern.test(packId)) errors.push("pack.id must be 3–80 letters, numbers, dots, dashes or underscores.");
  if (!normalizeText(rawPack.title)) errors.push("pack.title is required.");

  const existingPack = state.packs.find((item) => item.id === packId);
  const now = new Date().toISOString();
  const pack = {
    id: packId,
    title: normalizeText(rawPack.title),
    subtitle: normalizeText(rawPack.subtitle),
    author: normalizeText(rawPack.author),
    description: normalizeText(rawPack.description),
    color: /^#[0-9a-f]{6}$/i.test(rawPack.color) ? rawPack.color : "#d7e861",
    position: Number.isFinite(rawPack.position) ? rawPack.position : existingPack?.position ?? orderedPacks().length + 1,
    importedAt: existingPack?.importedAt || now,
    updatedAt: now,
    sourceNote: normalizeText(rawPack.sourceNote),
  };

  const ids = new Set();
  const orders = new Set();
  const lessons = [];
  const requiredFields = ["title", "summary", "action", "reflection"];

  (Array.isArray(payload.lessons) ? payload.lessons : []).forEach((rawLesson, index) => {
    const label = `Lesson ${index + 1}`;
    if (!rawLesson || typeof rawLesson !== "object" || Array.isArray(rawLesson)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    const id = normalizeText(rawLesson.id);
    const order = Number(rawLesson.order);
    if (!idPattern.test(id)) errors.push(`${label}: id is missing or invalid.`);
    if (ids.has(id)) errors.push(`${label}: duplicate id “${id}”.`);
    ids.add(id);
    if (!Number.isInteger(order) || order < 1) errors.push(`${label}: order must be a positive whole number.`);
    if (orders.has(order)) errors.push(`${label}: duplicate order ${order}.`);
    orders.add(order);
    requiredFields.forEach((field) => {
      if (!normalizeText(rawLesson[field])) errors.push(`${label}: ${field} is required.`);
    });

    const existing = state.lessons.find((item) => item.id === id);
    if (existing && existing.packId !== packId) {
      errors.push(`${label}: id “${id}” already belongs to another pack.`);
    }

    lessons.push({
      id,
      packId,
      order,
      title: normalizeText(rawLesson.title),
      summary: normalizeText(rawLesson.summary),
      whyItMatters: normalizeText(rawLesson.whyItMatters),
      example: normalizeText(rawLesson.example),
      action: normalizeText(rawLesson.action),
      reflection: normalizeText(rawLesson.reflection),
      tags: Array.isArray(rawLesson.tags)
        ? [...new Set(rawLesson.tags.map(normalizeText).filter(Boolean))].slice(0, 8)
        : [],
      updatedAt: now,
    });
  });

  const existingLessons = new Map(state.lessons.map((item) => [item.id, item]));
  const summary = { added: 0, updated: 0, unchanged: 0 };
  lessons.forEach((lesson) => {
    const existing = existingLessons.get(lesson.id);
    if (!existing) summary.added += 1;
    else if (contentFingerprint(existing) === contentFingerprint(lesson)) summary.unchanged += 1;
    else summary.updated += 1;
  });

  return { errors, pack, lessons, summary };
}

function validateBackup(payload) {
  const arrays = ["packs", "lessons", "progress", "reflections", "settings"];
  if (!payload || payload.type !== "daily-growth-backup" || payload.schemaVersion !== 1) {
    throw new Error("This is not a valid Daily Growth backup.");
  }
  arrays.forEach((key) => {
    if (!Array.isArray(payload[key])) throw new Error(`Backup is missing ${key}.`);
  });
  return payload;
}

async function refreshState() {
  const snapshot = await getSnapshot();
  Object.assign(state, snapshot);
}

function applyAppearance() {
  const theme = getSetting("theme");
  const resolvedTheme = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.fontScale = getSetting("fontScale") || "medium";
  quickTheme.textContent = resolvedTheme === "dark" ? "☀" : "☾";
  quickTheme.title = resolvedTheme === "dark" ? "Use light mode" : "Use dark mode";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolvedTheme === "dark" ? "#102d27" : "#f5f0e5");
}

function updateShell() {
  const [title, eyebrow] = VIEW_META[ui.view];
  pageTitle.textContent = ui.selectedLessonId && ui.view === "today" ? "Lesson" : title;
  pageEyebrow.textContent = eyebrow;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === ui.view);
    if (button.classList.contains("nav-item")) {
      if (button.dataset.view === ui.view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  });

  const stats = calculateStats();
  xpChip.innerHTML = `<span aria-hidden="true">✦</span><strong>${stats.xp}</strong><small>XP</small>`;
  sidebarGrowth.innerHTML = `
    <div class="level-row"><span>Level ${stats.level}</span><strong>${stats.levelProgress}/100 XP</strong></div>
    <div class="mini-progress" aria-label="${stats.levelProgress}% to the next level"><span style="width:${stats.levelProgress}%"></span></div>
    <p>${stats.total ? `${stats.completed} of ${stats.total} active lessons complete` : "Explore a World or import a pack"}</p>
  `;
}

function render() {
  updateShell();
  if (ui.view === "today") renderToday();
  if (ui.view === "journey") renderJourney();
  if (ui.view === "explore") renderExplore();
  if (ui.view === "journal") renderJournal();
  if (ui.view === "insights") renderInsights();
  if (ui.view === "settings") renderSettings();
}

function emptyLibraryMarkup() {
  return `
    <section class="welcome-panel">
      <div class="welcome-art" aria-hidden="true">
        <span class="sun-orbit"></span>
        <span class="growing-plant">♧</span>
        <span class="spark one">✦</span><span class="spark two">✧</span><span class="spark three">·</span>
      </div>
      <p class="eyebrow">Your private learning library</p>
      <h2>Small lessons.<br><em>Real growth.</em></h2>
      <p class="welcome-copy">Import a content pack and begin a gentle daily rhythm: one lesson, one action and one honest reflection.</p>
      <div class="welcome-actions">
        <button class="button primary" data-action="import-pack"><span aria-hidden="true">＋</span> Import content pack</button>
        <button class="button secondary" data-view="explore">Browse Explore Worlds</button>
        <button class="button secondary" data-action="load-sample">Try the 3-lesson sample</button>
      </div>
      <p class="privacy-line"><span aria-hidden="true">●</span> Your lessons and writing stay in this browser.</p>
    </section>
  `;
}

function renderToday() {
  if (!state.lessons.length) {
    main.innerHTML = emptyLibraryMarkup();
    return;
  }

  const activePackId = getActivePackId();
  const lessons = lessonsForPack(activePackId);
  const cursorIndex = getPackCursorIndex(lessons, activePackId);
  const selectedIndex = ui.selectedLessonId
    ? lessons.findIndex((lesson) => lesson.id === ui.selectedLessonId)
    : cursorIndex;
  const safeIndex = selectedIndex >= 0 ? selectedIndex : cursorIndex;
  renderLesson(lessons[safeIndex], safeIndex, lessons, cursorIndex, activePackId);
}

function renderPackSwitcher(activePackId) {
  const packs = orderedPacks();
  const activeLessons = lessonsForPack(activePackId);
  const completed = activeLessons.filter((lesson) => progressMap().get(lesson.id)?.completedAt).length;
  const pack = packs.find((item) => item.id === activePackId);

  return `
    <section class="pack-switcher" style="--pack-color:${escapeHtml(pack?.color || "#d7e861")}">
      <span class="pack-switcher-mark" aria-hidden="true">✦</span>
      <label for="today-pack-select">
        <small>Current content pack</small>
        <select id="today-pack-select">
          ${packs.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === activePackId ? "selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}
        </select>
      </label>
      <span class="pack-switcher-progress">${completed}/${activeLessons.length}<small> complete</small></span>
    </section>
  `;
}

function renderLesson(lesson, lessonIndex, lessons, cursorIndex, activePackId) {
  const packs = packMap();
  const progress = progressMap().get(lesson.id) || { lessonId: lesson.id };
  const savedReflection = reflectionMap().get(lesson.id)?.text || "";
  const savedActionNote = progress.actionNote || "";
  const pack = packs.get(lesson.packId);
  const isComplete = Boolean(progress.completedAt);
  const actionComplete = Boolean(progress.actionCompletedAt);
  const isCurrent = lessonIndex === cursorIndex;
  const nextLesson = lessons[lessonIndex + 1];

  main.innerHTML = `
    <section class="today-layout">
      <div class="lesson-column">
        ${renderPackSwitcher(activePackId)}
        ${!isCurrent ? `<button class="back-to-today" data-action="go-current">← Back to this pack’s current lesson</button>` : ""}

        <article class="lesson-paper ${isComplete ? "is-complete" : ""}">
          <div class="paper-accent" style="--pack-color:${escapeHtml(pack?.color || "#d7e861")}"></div>
          <div class="lesson-meta">
            <span>Lesson ${lessonIndex + 1} of ${lessons.length}</span>
            <span class="meta-dot">•</span>
            <span>${escapeHtml(pack?.title || "Content pack")}</span>
          </div>
          <h2>${escapeHtml(lesson.title)}</h2>
          <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>

          ${lesson.whyItMatters ? `
            <section class="lesson-section why-section">
              <span class="section-symbol" aria-hidden="true">◎</span>
              <div><h3>Why it matters</h3><p>${escapeHtml(lesson.whyItMatters)}</p></div>
            </section>
          ` : ""}

          ${lesson.example ? `
            <section class="lesson-section example-section">
              <span class="section-symbol" aria-hidden="true">“</span>
              <div><h3>Picture this</h3><p>${escapeHtml(lesson.example)}</p></div>
            </section>
          ` : ""}

          ${lesson.tags?.length ? `<div class="tag-row">${lesson.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </article>

        <section class="practice-card action-card ${actionComplete ? "is-done" : ""}">
          <div class="practice-number">01</div>
          <div class="practice-content">
            <p class="eyebrow">Today’s action</p>
            <p class="action-suggestion"><strong>Suggested:</strong> ${escapeHtml(lesson.action)}</p>
            <label class="action-input-label" for="action-note">What will you do?</label>
            <div class="action-input-row">
              <input id="action-note" type="text" maxlength="280" placeholder="Write your concrete action…" value="${escapeHtml(savedActionNote)}" />
              <button class="button secondary small" data-action="save-action-note" data-lesson-id="${escapeHtml(lesson.id)}">Save</button>
            </div>
            <button class="check-action" data-action="toggle-action" data-lesson-id="${escapeHtml(lesson.id)}" aria-pressed="${actionComplete}">
              <span class="check-box" aria-hidden="true">${actionComplete ? "✓" : ""}</span>
              ${actionComplete ? "Action completed" : "I did this today"}
              <small>+10 XP</small>
            </button>
          </div>
        </section>

        <section class="practice-card reflection-card">
          <div class="practice-number">02</div>
          <div class="practice-content">
            <p class="eyebrow">Pause &amp; reflect</p>
            <h3>${escapeHtml(lesson.reflection)}</h3>
            <label class="sr-only" for="reflection-text">Your reflection</label>
            <textarea id="reflection-text" rows="5" placeholder="Write what comes to mind…">${escapeHtml(savedReflection)}</textarea>
            <div class="reflection-footer">
              <span>Your words stay on this device.</span>
              <button class="button secondary small" data-action="save-reflection" data-lesson-id="${escapeHtml(lesson.id)}">Save reflection <small>+5 XP</small></button>
            </div>
          </div>
        </section>

        <div class="lesson-completion">
          <button class="button ${isComplete ? "completed" : "primary"} complete-button" data-action="complete-lesson" data-lesson-id="${escapeHtml(lesson.id)}" ${isComplete ? "disabled" : ""}>
            <span aria-hidden="true">${isComplete ? "✓" : "✦"}</span>
            ${isComplete ? `Completed ${formatDate(progress.completedAt, { month: "short", day: "numeric" })}` : nextLesson ? "Complete & continue" : "Complete content pack"}
            ${isComplete ? "" : "<small>+10 XP</small>"}
          </button>
          <p>${isComplete ? "This lesson is part of your growth story." : "There is no perfect answer. Showing up is enough."}</p>
        </div>

        <div class="lesson-pagination" aria-label="Lesson navigation">
          <button data-action="open-lesson-in-pack" data-lesson-id="${escapeHtml(lessons[lessonIndex - 1]?.id || "")}" ${lessonIndex === 0 ? "disabled" : ""}>← <span>Previous</span></button>
          <span>${lessonIndex + 1} / ${lessons.length}</span>
          <button data-action="open-lesson-in-pack" data-lesson-id="${escapeHtml(lessons[lessonIndex + 1]?.id || "")}" ${lessonIndex === lessons.length - 1 ? "disabled" : ""}><span>Next</span> →</button>
        </div>
      </div>

      <aside class="today-aside">
        ${renderDailyProgressCard(lessons, cursorIndex, pack)}
        ${renderQuoteCard(pack)}
      </aside>
    </section>
  `;
}

function renderDailyProgressCard(lessons, cursorIndex, pack) {
  const stats = calculateStats(lessons);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (stats.completionPercent / 100) * circumference;
  return `
    <section class="daily-progress-card">
      <p class="eyebrow">${escapeHtml(pack?.title || "Current content pack")}</p>
      <div class="ring-wrap">
        <svg viewBox="0 0 100 100" role="img" aria-label="${stats.completionPercent}% complete">
          <circle class="ring-track" cx="50" cy="50" r="42"></circle>
          <circle class="ring-value" cx="50" cy="50" r="42" style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"></circle>
        </svg>
        <div><strong>${stats.completionPercent}%</strong><small>complete</small></div>
      </div>
      <dl class="mini-stats">
        <div><dt>Current</dt><dd>${cursorIndex + 1}/${lessons.length}</dd></div>
        <div><dt>Completed</dt><dd>${stats.completed}</dd></div>
        <div><dt>Rhythm</dt><dd>${stats.streak} ${stats.streak === 1 ? "day" : "days"}</dd></div>
      </dl>
      <button class="text-button" data-action="view-active-pack">See this content pack <span>→</span></button>
    </section>
  `;
}

function renderQuoteCard(pack) {
  return `
    <section class="aside-note" style="--pack-color:${escapeHtml(pack?.color || "#d7e861")}">
      <span aria-hidden="true">✦</span>
      <p>Growth is not a race. It is the quiet result of returning to what matters.</p>
    </section>
  `;
}

function renderJourney() {
  const lessons = orderedLessons();
  if (!lessons.length) {
    main.innerHTML = emptyLibraryMarkup();
    return;
  }
  const packs = orderedPacks();
  const progress = progressMap();
  const activePackId = getActivePackId();
  const activePackLessons = lessonsForPack(activePackId);
  const activeLesson = activePackLessons[getPackCursorIndex(activePackLessons, activePackId)];
  const query = ui.journeySearch.toLowerCase();
  const filtered = lessons.filter((lesson) => {
    const matchesPack = ui.journeyPack === "all" || lesson.packId === ui.journeyPack;
    const matchesSearch = !query || `${lesson.title} ${lesson.summary} ${(lesson.tags || []).join(" ")}`.toLowerCase().includes(query);
    return matchesPack && matchesSearch;
  });
  const scopeLessons = ui.journeyPack === "all" ? lessons : lessonsForPack(ui.journeyPack);
  const stats = calculateStats(scopeLessons);

  main.innerHTML = `
    <section class="journey-hero">
      <div>
        <p class="eyebrow">The path so far</p>
        <h2>${stats.completed} lessons lived,<br><em>${stats.total - stats.completed} still to discover.</em></h2>
      </div>
      <div class="journey-hero-stat"><strong>${stats.completionPercent}%</strong><span>of your journey</span></div>
    </section>

    <section class="journey-toolbar" aria-label="Filter lessons">
      <label class="search-box"><span aria-hidden="true">⌕</span><span class="sr-only">Search lessons</span><input id="journey-search" type="search" placeholder="Search your lessons" value="${escapeHtml(ui.journeySearch)}" /></label>
      <label class="select-box"><span class="sr-only">Filter by content pack</span><select id="journey-pack-filter"><option value="all">All content packs</option>${packs.map((pack) => `<option value="${escapeHtml(pack.id)}" ${ui.journeyPack === pack.id ? "selected" : ""}>${escapeHtml(pack.title)}</option>`).join("")}</select></label>
    </section>

    <section class="journey-path">
      ${filtered.length ? filtered.map((lesson) => {
        const globalIndex = lessons.findIndex((item) => item.id === lesson.id);
        const pack = packs.find((item) => item.id === lesson.packId);
        const itemProgress = progress.get(lesson.id);
        const completed = Boolean(itemProgress?.completedAt);
        const current = lesson.id === activeLesson?.id;
        const displayNumber = ui.journeyPack === "all" ? globalIndex + 1 : lesson.order;
        return `
          <button class="journey-step ${completed ? "is-complete" : ""} ${current ? "is-today" : ""}" data-action="open-lesson" data-lesson-id="${escapeHtml(lesson.id)}">
            <span class="step-marker">${completed ? "✓" : displayNumber}</span>
            <span class="step-body">
              <small>${escapeHtml(pack?.title || "Content pack")} ${current ? "· Current" : ""}</small>
              <strong>${escapeHtml(lesson.title)}</strong>
              <span>${escapeHtml(lesson.summary)}</span>
            </span>
            <span class="step-status">${completed ? formatDate(itemProgress.completedAt, { month: "short", day: "numeric" }) : "Read →"}</span>
          </button>
        `;
      }).join("") : `<div class="empty-filter"><span aria-hidden="true">⌕</span><h3>No lessons found</h3><p>Try another phrase or content pack.</p></div>`}
    </section>
  `;
}

function renderExplore() {
  if (ui.exploreTerritoryId && exploreTerritoryById.has(ui.exploreTerritoryId)) {
    renderExploreTerritory(exploreTerritoryById.get(ui.exploreTerritoryId));
    return;
  }

  const analytics = exploreAnalytics();
  const activeTerritoryId = getSetting("explore:activeTerritoryId");
  const activeTerritory = exploreTerritoryById.get(activeTerritoryId);
  const activeStats = activeTerritory ? territoryStats(activeTerritory.id) : null;
  const selectedWorld = EXPLORE_WORLDS.find((world) => world.id === ui.exploreWorldId);

  main.innerHTML = `
    <section class="explore-hero">
      <div class="explore-hero-copy">
        <p class="eyebrow">A second learning lane</p>
        <h2>Follow curiosity<br><em>beyond the familiar.</em></h2>
        <p>Explore 12 Worlds through focused five-day journeys. Each day takes about 5–10 minutes and ends with a small act of retrieval.</p>
        <button class="button explore-surprise" data-action="surprise-me"><span aria-hidden="true">✦</span> Take Me Somewhere New</button>
        <small>The suggestion avoids recent journeys and leans toward Worlds you know less well.</small>
      </div>
      <div class="explore-orbit" aria-hidden="true">
        <span class="orbit-core">◇</span>
        ${EXPLORE_WORLDS.slice(0, 6).map((world, index) => `<i style="--orbit-index:${index}">${world.symbol}</i>`).join("")}
      </div>
    </section>

    <section class="explore-summary" aria-label="Explore progress">
      <div><strong>${analytics.worldsStarted.size}<small>/12</small></strong><span>Worlds entered</span></div>
      <div><strong>${analytics.startedTerritories.length}<small>/60</small></strong><span>Territories started</span></div>
      <div><strong>${analytics.completedTerritories.length}</strong><span>Journeys completed</span></div>
      <div><strong>${analytics.retention === null ? "—" : `${analytics.retention}%`}</strong><span>Recall signal</span></div>
    </section>

    ${activeTerritory && activeStats && !activeStats.finished ? `
      <section class="explore-resume" style="--world-color:${escapeHtml(activeTerritory.color)}">
        <span class="resume-symbol" aria-hidden="true">${activeTerritory.worldSymbol}</span>
        <div><p class="eyebrow">Continue exploring</p><h3>${escapeHtml(activeTerritory.title)}</h3><span>Day ${activeStats.currentIndex + 1} of 5 · ${escapeHtml(activeTerritory.worldTitle)}</span></div>
        <div class="resume-progress"><span style="width:${activeStats.percent}%"></span></div>
        <button class="button secondary small" data-action="open-explore-territory" data-territory-id="${escapeHtml(activeTerritory.id)}">Resume →</button>
      </section>
    ` : ""}

    <section class="world-browser">
      <div class="section-heading"><div><p class="eyebrow">Browse Worlds</p><h2>Choose a direction</h2></div><span>5 territories in every World</span></div>
      <div class="world-grid">
        ${EXPLORE_WORLDS.map((world) => {
          const worldStarted = world.territories.filter(([territoryId]) => analytics.started.has(territoryId)).length;
          return `
            <button class="world-card ${selectedWorld?.id === world.id ? "is-selected" : ""}" style="--world-color:${escapeHtml(world.color)}" data-action="select-world" data-world-id="${escapeHtml(world.id)}">
              <span class="world-symbol" aria-hidden="true">${world.symbol}</span>
              <small>${worldStarted}/5 explored</small>
              <strong>${escapeHtml(world.title)}</strong>
              <p>${escapeHtml(world.description)}</p>
              <i aria-hidden="true">→</i>
            </button>
          `;
        }).join("")}
      </div>
    </section>

    ${selectedWorld ? `
      <section class="territory-browser" id="territories">
        <div class="territory-heading" style="--world-color:${escapeHtml(selectedWorld.color)}">
          <span aria-hidden="true">${selectedWorld.symbol}</span>
          <div><p class="eyebrow">${escapeHtml(selectedWorld.title)}</p><h2>Choose a five-day territory</h2><p>${escapeHtml(selectedWorld.description)}</p></div>
        </div>
        <div class="territory-grid">
          ${selectedWorld.territories.map(([territoryId]) => {
            const territory = exploreTerritoryById.get(territoryId);
            const stats = territoryStats(territoryId);
            const started = analytics.started.has(territoryId);
            return `
              <button class="territory-card ${stats.finished ? "is-complete" : ""}" data-action="open-explore-territory" data-territory-id="${escapeHtml(territoryId)}">
                <div class="territory-card-top"><span>${stats.finished ? "✓" : started ? `${stats.completed}/5` : "5 days"}</span><small>5–10 min/day</small></div>
                <strong>${escapeHtml(territory.title)}</strong>
                <p>${escapeHtml(territory.description)}</p>
                <div class="territory-progress"><span style="width:${stats.percent}%;background:${escapeHtml(territory.color)}"></span></div>
                <b>${stats.finished ? "Revisit" : started ? "Continue" : "Preview"} →</b>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    ` : ""}
  `;
}

function renderExploreTerritory(territory) {
  const analytics = exploreAnalytics();
  const stats = territoryStats(territory.id);
  const started = analytics.started.has(territory.id);
  const safeDayIndex = Math.max(0, Math.min(4, Number(ui.exploreDayIndex) || 0));
  const lesson = stats.lessons[safeDayIndex];
  const progress = progressMap().get(lesson.id) || { lessonId: lesson.id };
  const savedReflection = reflectionMap().get(lesson.id)?.text || "";
  const savedActionNote = progress.actionNote || "";
  const isComplete = Boolean(progress.completedAt);
  const actionComplete = Boolean(progress.actionCompletedAt);
  const recallRating = progress.recallRating || "";

  main.innerHTML = `
    <button class="back-to-explore" data-action="back-explore">← Back to all Worlds</button>
    ${ui.exploreSuggestionReason ? `<section class="suggestion-reason"><span aria-hidden="true">✦</span><div><strong>Why this journey?</strong><p>${escapeHtml(ui.exploreSuggestionReason)}</p></div></section>` : ""}
    <section class="territory-hero" style="--world-color:${escapeHtml(territory.color)}">
      <div><p class="eyebrow">${escapeHtml(territory.worldTitle)}</p><h2>${escapeHtml(territory.title)}</h2><p>${escapeHtml(territory.description)}</p></div>
      <div class="territory-hero-meta"><span>${territory.worldSymbol}</span><strong>5 days</strong><small>5–10 minutes per day</small></div>
    </section>

    <nav class="explore-day-nav" aria-label="Journey days">
      ${stats.lessons.map((day, index) => {
        const dayProgress = progressMap().get(day.id);
        const done = Boolean(dayProgress?.completedAt);
        return `<button class="${index === safeDayIndex ? "is-active" : ""} ${done ? "is-complete" : ""}" data-action="open-explore-day" data-day-index="${index}"><span>${done ? "✓" : index + 1}</span><small>Day ${index + 1}</small><strong>${escapeHtml(day.exploreDayLabel)}</strong></button>`;
      }).join("")}
    </nav>

    ${!started ? `
      <section class="explore-preview">
        <div><p class="eyebrow">Your route</p><h2>Five small steps into ${escapeHtml(territory.title)}</h2><p>You can read every day at your own pace. Starting adds this territory to your Explore path and makes Day 1 your current session.</p></div>
        <ol>${stats.lessons.map((day, index) => `<li><span>0${index + 1}</span><div><strong>${escapeHtml(day.exploreDayLabel)}</strong><small>${escapeHtml(day.title)}</small></div></li>`).join("")}</ol>
        <button class="button primary" data-action="start-territory" data-territory-id="${escapeHtml(territory.id)}">Begin this journey <span>→</span></button>
      </section>
    ` : `
      <section class="explore-lesson-layout">
        <div class="lesson-column">
          <article class="lesson-paper explore-paper ${isComplete ? "is-complete" : ""}">
            <div class="paper-accent" style="--pack-color:${escapeHtml(territory.color)}"></div>
            <div class="lesson-meta"><span>Day ${safeDayIndex + 1} of 5</span><span class="meta-dot">•</span><span>${escapeHtml(lesson.exploreDayLabel)}</span></div>
            <h2>${escapeHtml(lesson.title)}</h2>
            <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
            <section class="lesson-section why-section"><span class="section-symbol" aria-hidden="true">◎</span><div><h3>Why it matters</h3><p>${escapeHtml(lesson.whyItMatters)}</p></div></section>
            <section class="lesson-section example-section"><span class="section-symbol" aria-hidden="true">◇</span><div><h3>Look for this</h3><p>${escapeHtml(lesson.example)}</p></div></section>
            <div class="tag-row">${lesson.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          </article>

          <section class="practice-card action-card ${actionComplete ? "is-done" : ""}">
            <div class="practice-number">01</div>
            <div class="practice-content">
              <p class="eyebrow">Today’s action</p>
              <p class="action-suggestion"><strong>Suggested:</strong> ${escapeHtml(lesson.action)}</p>
              <label class="action-input-label" for="action-note">What will you do?</label>
              <div class="action-input-row"><input id="action-note" type="text" maxlength="280" placeholder="Write your concrete action…" value="${escapeHtml(savedActionNote)}" /><button class="button secondary small" data-action="save-action-note" data-lesson-id="${escapeHtml(lesson.id)}">Save</button></div>
              <button class="check-action" data-action="toggle-action" data-lesson-id="${escapeHtml(lesson.id)}" aria-pressed="${actionComplete}"><span class="check-box" aria-hidden="true">${actionComplete ? "✓" : ""}</span>${actionComplete ? "Action completed" : "I did this today"}<small>+10 XP</small></button>
            </div>
          </section>

          <section class="practice-card reflection-card">
            <div class="practice-number">02</div>
            <div class="practice-content"><p class="eyebrow">Pause &amp; reflect</p><h3>${escapeHtml(lesson.reflection)}</h3><label class="sr-only" for="reflection-text">Your reflection</label><textarea id="reflection-text" rows="5" placeholder="Write what comes to mind…">${escapeHtml(savedReflection)}</textarea><div class="reflection-footer"><span>Your words stay on this device.</span><button class="button secondary small" data-action="save-reflection" data-lesson-id="${escapeHtml(lesson.id)}">Save reflection <small>+5 XP</small></button></div></div>
          </section>

          <section class="recall-card">
            <div><p class="eyebrow">Memory check</p><h3>Without looking back, how available is today’s idea?</h3><p>This is a signal, not a grade. It helps Explore rotate toward areas that need more attention.</p></div>
            <div class="recall-options" role="group" aria-label="Recall rating">
              ${[["revisit", "↻", "Revisit"], ["familiar", "~", "Familiar"], ["remembered", "✓", "Remembered"]].map(([value, icon, label]) => `<button class="${recallRating === value ? "is-active" : ""}" data-action="rate-recall" data-lesson-id="${escapeHtml(lesson.id)}" data-rating="${value}"><span>${icon}</span><strong>${label}</strong></button>`).join("")}
            </div>
          </section>

          <div class="lesson-completion">
            <button class="button ${isComplete ? "completed" : "primary"} complete-button" data-action="complete-explore-day" data-lesson-id="${escapeHtml(lesson.id)}" ${isComplete ? "disabled" : ""}><span aria-hidden="true">${isComplete ? "✓" : "✦"}</span>${isComplete ? `Completed ${formatDate(progress.completedAt, { month: "short", day: "numeric" })}` : safeDayIndex < 4 ? "Complete & continue" : "Complete territory"}${isComplete ? "" : "<small>+10 XP</small>"}</button>
            <p>${stats.finished ? "This territory is now part of your wider map." : "Small retrievals turn exposure into usable knowledge."}</p>
          </div>
        </div>

        <aside class="explore-aside">
          <section class="explore-progress-card" style="--world-color:${escapeHtml(territory.color)}"><p class="eyebrow">Territory progress</p><strong>${stats.completed}<small>/5 days</small></strong><div class="territory-progress"><span style="width:${stats.percent}%"></span></div><dl><div><dt>Recall</dt><dd>${stats.retention === null ? "—" : `${stats.retention}%`}</dd></div><div><dt>World</dt><dd>${EXPLORE_WORLDS.findIndex((world) => world.id === territory.worldId) + 1}/12</dd></div></dl>${stats.finished ? `<button class="button secondary small" data-action="surprise-me">Find another World</button>` : ""}</section>
        </aside>
      </section>
    `}
  `;
}

function renderJournal() {
  const lessons = allKnownLessons();
  const lessonById = new Map(lessons.map((item, index) => [item.id, { ...item, globalIndex: index }]));
  const entries = [...state.reflections]
    .filter((item) => item.text?.trim() && lessonById.has(item.lessonId))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  main.innerHTML = `
    <section class="journal-intro">
      <div class="journal-mark" aria-hidden="true">✎</div>
      <div><h2>Your private thinking space</h2><p>Every reflection is saved on this device and connected to the lesson that prompted it.</p></div>
    </section>
    ${entries.length ? `
      <section class="journal-grid">
        ${entries.map((entry) => {
          const lesson = lessonById.get(entry.lessonId);
          return `
            <article class="journal-entry">
              <div class="journal-entry-head"><span>${lesson.explore ? `Explore · Day ${lesson.order}` : `Day ${lesson.globalIndex + 1}`}</span><time>${formatDate(entry.updatedAt)}</time></div>
              <h3>${escapeHtml(lesson.reflection)}</h3>
              <p>${escapeHtml(entry.text)}</p>
              <button class="text-button" data-action="open-lesson" data-lesson-id="${escapeHtml(lesson.id)}">Return to “${escapeHtml(lesson.title)}” <span>→</span></button>
            </article>
          `;
        }).join("")}
      </section>
    ` : `
      <section class="empty-state">
        <span class="empty-icon" aria-hidden="true">✎</span>
        <h2>Your first reflection starts with one honest sentence.</h2>
        <p>Open the current lesson in your selected content pack, pause for a moment, and write whatever feels true.</p>
        <button class="button primary" data-view="today">Go to current lesson</button>
      </section>
    `}
  `;
}

function renderInsights() {
  const stats = calculateStats();
  const lessons = activeLearningLessons();
  const bookLessons = orderedLessons();
  const progress = progressMap();
  const packs = orderedPacks();
  const explore = exploreAnalytics();
  const days = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    days.push({ key: localDateKey(date), label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date) });
  }

  main.innerHTML = `
    <section class="insight-grid">
      <article class="stat-card feature-stat"><span class="stat-symbol" aria-hidden="true">✦</span><small>Current level</small><strong>${stats.level}</strong><p>${100 - stats.levelProgress} XP to Level ${stats.level + 1}</p><div class="mini-progress"><span style="width:${stats.levelProgress}%"></span></div></article>
      <article class="stat-card"><span class="stat-symbol warm" aria-hidden="true">☀</span><small>Reading rhythm</small><strong>${stats.streak}</strong><p>${stats.streak === 1 ? "day" : "days"} in your current rhythm</p></article>
      <article class="stat-card"><span class="stat-symbol coral" aria-hidden="true">✓</span><small>Lessons complete</small><strong>${stats.completed}</strong><p>${stats.total ? `${stats.completionPercent}% of ${stats.total} active lessons` : "Start a lesson or territory"}</p></article>
      <article class="stat-card"><span class="stat-symbol lilac" aria-hidden="true">✎</span><small>Reflections saved</small><strong>${stats.reflectionCount}</strong><p>Thoughts you can revisit</p></article>
    </section>

    <section class="activity-panel">
      <div class="section-heading"><div><p class="eyebrow">Last 14 days</p><h2>Your showing-up rhythm</h2></div><span>${stats.xp} total XP</span></div>
      <div class="rhythm-days">
        ${days.map((day) => `<div class="rhythm-day ${stats.completionDays.has(day.key) ? "is-active" : ""}"><span>${day.label}</span><i aria-label="${formatDate(day.key)} ${stats.completionDays.has(day.key) ? "completed" : "no completion"}">${stats.completionDays.has(day.key) ? "✓" : ""}</i><small>${day.key.slice(8)}</small></div>`).join("")}
      </div>
      <p class="gentle-note">A quiet day does not erase your progress. Return when you can.</p>
    </section>

    <section class="explore-insights-panel">
      <div class="section-heading"><div><p class="eyebrow">Explore</p><h2>Breadth &amp; retention</h2></div><button class="button secondary small" data-view="explore">Open Explore →</button></div>
      <div class="explore-insight-summary">
        <article><span aria-hidden="true">◇</span><div><small>Breadth</small><strong>${explore.breadthPercent}%</strong><p>${explore.worldsStarted.size} of 12 Worlds entered</p></div></article>
        <article><span aria-hidden="true">◎</span><div><small>Recall signal</small><strong>${explore.retention === null ? "—" : `${explore.retention}%`}</strong><p>${explore.ratedCount ? `${explore.ratedCount} memory ${explore.ratedCount === 1 ? "check" : "checks"}` : "Rate recall after an Explore day"}</p></div></article>
        <article><span aria-hidden="true">✓</span><div><small>Territories</small><strong>${explore.completedTerritories.length}<small> complete</small></strong><p>${explore.startedTerritories.length} of 60 started</p></div></article>
      </div>
      <div class="world-coverage-list">
        ${EXPLORE_WORLDS.map((world) => {
          const started = world.territories.filter(([territoryId]) => explore.started.has(territoryId)).length;
          const completed = world.territories.filter(([territoryId]) => territoryStats(territoryId).finished).length;
          return `<button data-action="view-insight-world" data-world-id="${escapeHtml(world.id)}"><span class="pack-dot" style="background:${escapeHtml(world.color)}"></span><div><strong>${escapeHtml(world.title)}</strong><small>${completed} complete · ${started}/5 entered</small><div class="pack-bar"><span style="width:${started * 20}%;background:${escapeHtml(world.color)}"></span></div></div><b>${started * 20}%</b></button>`;
        }).join("")}
      </div>
      <p class="gentle-note">Breadth rewards entering different Worlds. Recall is based only on your own Revisit, Familiar and Remembered checks—not a test score.</p>
    </section>

    <section class="pack-progress-panel">
      <div class="section-heading"><div><p class="eyebrow">Content packs</p><h2>Growth by collection</h2></div></div>
      <div class="pack-progress-list">
        ${packs.length ? packs.map((pack) => {
          const packLessons = bookLessons.filter((lesson) => lesson.packId === pack.id);
          const done = packLessons.filter((lesson) => progress.get(lesson.id)?.completedAt).length;
          const percent = packLessons.length ? Math.round((done / packLessons.length) * 100) : 0;
          return `<div class="pack-progress-item"><span class="pack-dot" style="background:${escapeHtml(pack.color)}"></span><div><div><strong>${escapeHtml(pack.title)}</strong><span>${done}/${packLessons.length}</span></div><div class="pack-bar"><span style="width:${percent}%;background:${escapeHtml(pack.color)}"></span></div></div><b>${percent}%</b></div>`;
        }).join("") : `<div class="inline-empty"><p>No imported content packs yet. Explore remains ready whenever curiosity strikes.</p><button class="text-button" data-view="explore">Browse Worlds →</button></div>`}
      </div>
    </section>
  `;
}

function renderSettings() {
  const theme = getSetting("theme") || "system";
  const fontScale = getSetting("fontScale") || "medium";
  const packs = orderedPacks();
  const lessons = orderedLessons();
  const activePackId = getActivePackId();

  main.innerHTML = `
    <div class="settings-grid">
      <section class="settings-section">
        <div class="settings-heading"><span aria-hidden="true">◐</span><div><h2>Appearance</h2><p>Choose a reading experience that feels comfortable.</p></div></div>
        <div class="setting-row">
          <div><strong>Colour theme</strong><span>Use your device setting or choose one.</span></div>
          <div class="segmented-control" aria-label="Colour theme">
            ${["light", "system", "dark"].map((value) => `<button data-action="set-setting" data-setting="theme" data-value="${value}" class="${theme === value ? "is-active" : ""}">${value[0].toUpperCase() + value.slice(1)}</button>`).join("")}
          </div>
        </div>
        <div class="setting-row">
          <div><strong>Text size</strong><span>Applied to lesson and journal text.</span></div>
          <div class="segmented-control" aria-label="Text size">
            ${[["small", "A"], ["medium", "A"], ["large", "A"]].map(([value, label], index) => `<button data-action="set-setting" data-setting="fontScale" data-value="${value}" class="font-choice font-${index + 1} ${fontScale === value ? "is-active" : ""}">${label}</button>`).join("")}
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-heading"><span aria-hidden="true">◷</span><div><h2>Reading track</h2><p>Choose which content pack Today should continue.</p></div></div>
        <label class="setting-row setting-date">
          <div><strong>Current content pack</strong><span>Every pack remembers its own reading position.</span></div>
          <select id="settings-active-pack">
            ${packs.map((pack) => `<option value="${escapeHtml(pack.id)}" ${pack.id === activePackId ? "selected" : ""}>${escapeHtml(pack.title)}</option>`).join("")}
          </select>
        </label>
      </section>

      <section class="settings-section content-section">
        <div class="settings-heading"><span aria-hidden="true">▤</span><div><h2>Content library</h2><p>Imports add new lessons and update matching IDs without resetting progress.</p></div><button class="button primary small" data-action="import-pack">＋ Import pack</button></div>
        <div class="content-pack-list">
          ${packs.length ? packs.map((pack) => {
            const count = lessons.filter((lesson) => lesson.packId === pack.id).length;
            return `<article class="content-pack-row"><span class="pack-cover" style="--pack-color:${escapeHtml(pack.color)}">✦</span><div><strong>${escapeHtml(pack.title)}</strong><span>${count} ${count === 1 ? "lesson" : "lessons"}${pack.author ? ` · ${escapeHtml(pack.author)}` : ""}</span></div><small>Imported ${formatDate(pack.importedAt, { month: "short", day: "numeric", year: "numeric" })}</small><button class="icon-button quiet" data-action="remove-pack" data-pack-id="${escapeHtml(pack.id)}" aria-label="Remove ${escapeHtml(pack.title)}" title="Remove content pack">×</button></article>`;
          }).join("") : `<div class="inline-empty"><p>No content packs yet.</p><button class="text-button" data-action="load-sample">Load the sample pack →</button></div>`}
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-heading"><span aria-hidden="true">⇄</span><div><h2>Backup &amp; transfer</h2><p>Move your library, progress and reflections between devices.</p></div></div>
        <div class="data-actions">
          <button class="data-action" data-action="export-backup"><span aria-hidden="true">↓</span><div><strong>Export full backup</strong><small>Content, Explore, progress, journal and settings</small></div></button>
          <button class="data-action" data-action="restore-backup"><span aria-hidden="true">↑</span><div><strong>Restore a backup</strong><small>Merges records using their permanent IDs</small></div></button>
        </div>
      </section>

      <section class="settings-section danger-zone">
        <div class="settings-heading"><span aria-hidden="true">!</span><div><h2>Reset this device</h2><p>Export a backup first if you may want your data later.</p></div><button class="button danger-outline small" data-action="clear-all">Erase all local data</button></div>
      </section>

      <section class="independent-note">
        <strong>Independent by design.</strong>
        <p>Daily Growth is a private, local-first learning tool. No third-party book content is bundled with this app, and imported content stays on your device.</p>
        <small>Daily Growth v${APP_VERSION}</small>
      </section>
    </div>
  `;
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.innerHTML = `<span aria-hidden="true">${tone === "success" ? "✓" : "!"}</span><p>${escapeHtml(message)}</p>`;
  toastRegion.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function celebrate() {
  const layer = document.querySelector("#confetti");
  const colors = ["#d7e861", "#f0a36e", "#8dc4b6", "#e4c6ee", "#f5d275"];
  layer.innerHTML = Array.from({ length: 42 }, (_, index) => `<i style="--x:${Math.random() * 100}%;--delay:${Math.random() * 0.35}s;--spin:${Math.random() * 720 - 360}deg;--color:${colors[index % colors.length]}"></i>`).join("");
  layer.classList.add("is-active");
  setTimeout(() => {
    layer.classList.remove("is-active");
    layer.innerHTML = "";
  }, 2200);
}

function showConfirm(title, message, buttonLabel, callback) {
  document.querySelector("#confirm-dialog-title").textContent = title;
  confirmMessage.textContent = message;
  confirmAccept.textContent = buttonLabel;
  ui.confirmAction = callback;
  confirmDialog.showModal();
}

function closeImportDialog() {
  if (importDialog.open) importDialog.close();
  ui.pendingImport = null;
  ui.pendingBackup = null;
}

function showImportPreview(result, filename) {
  ui.pendingImport = result;
  const { pack, lessons, summary, errors } = result;
  importDialogContent.innerHTML = `
    <div class="dialog-head">
      <span class="dialog-icon ${errors.length ? "warning" : ""}" aria-hidden="true">${errors.length ? "!" : "＋"}</span>
      <div><p class="eyebrow">Content pack preview</p><h2 id="import-dialog-title">${errors.length ? "This file needs attention" : escapeHtml(pack.title)}</h2><small>${escapeHtml(filename)}</small></div>
      <button class="icon-button quiet dialog-close" data-action="close-import" aria-label="Close">×</button>
    </div>
    ${errors.length ? `
      <div class="validation-errors"><strong>Import stopped</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>
    ` : `
      <p class="dialog-copy">${escapeHtml(pack.description || "A Daily Growth content pack ready for your private library.")}</p>
      <div class="import-summary">
        <div class="added"><strong>${summary.added}</strong><span>New</span></div>
        <div class="updated"><strong>${summary.updated}</strong><span>Updated</span></div>
        <div><strong>${summary.unchanged}</strong><span>Unchanged</span></div>
      </div>
      <div class="preview-lessons"><p>${lessons.length} lessons in this pack</p><ol>${lessons.slice(0, 4).map((lesson) => `<li><span>${lesson.order}</span>${escapeHtml(lesson.title)}</li>`).join("")}${lessons.length > 4 ? `<li class="more-lessons">+ ${lessons.length - 4} more lessons</li>` : ""}</ol></div>
    `}
    <div class="dialog-actions">
      <button class="button ghost" data-action="close-import">${errors.length ? "Close" : "Cancel"}</button>
      ${errors.length ? "" : `<button class="button primary" data-action="confirm-import">Add to Daily Growth</button>`}
    </div>
  `;
  if (!importDialog.open) importDialog.showModal();
}

function showBackupPreview(backup, filename) {
  ui.pendingBackup = backup;
  importDialogContent.innerHTML = `
    <div class="dialog-head">
      <span class="dialog-icon" aria-hidden="true">↑</span>
      <div><p class="eyebrow">Backup preview</p><h2 id="import-dialog-title">Ready to restore</h2><small>${escapeHtml(filename)}</small></div>
      <button class="icon-button quiet dialog-close" data-action="close-import" aria-label="Close">×</button>
    </div>
    <p class="dialog-copy">The backup will merge with this device using permanent IDs. Matching records will be updated; unrelated data will remain.</p>
    <div class="import-summary four-items">
      <div><strong>${backup.packs.length}</strong><span>Packs</span></div>
      <div><strong>${backup.lessons.length}</strong><span>Lessons</span></div>
      <div><strong>${backup.progress.length}</strong><span>Progress</span></div>
      <div><strong>${backup.reflections.length}</strong><span>Reflections</span></div>
    </div>
    <div class="dialog-actions"><button class="button ghost" data-action="close-import">Cancel</button><button class="button primary" data-action="confirm-backup">Merge backup</button></div>
  `;
  if (!importDialog.open) importDialog.showModal();
}

async function readJsonFile(file, kind) {
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("Please choose a JSON file smaller than 10 MB.");
    const payload = JSON.parse(await file.text());
    if (kind === "backup") showBackupPreview(validateBackup(payload), file.name);
    else showImportPreview(validateContentPack(payload), file.name);
  } catch (error) {
    showToast(error instanceof SyntaxError ? "That file is not valid JSON." : error.message, "error");
  }
}

async function loadSamplePack() {
  try {
    const response = await fetch("./sample-content-pack.json");
    if (!response.ok) throw new Error("The sample pack could not be loaded.");
    showImportPreview(validateContentPack(await response.json()), "sample-content-pack.json");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleAction(button) {
  const action = button.dataset.action;
  if (!action) return;

  if (action === "import-pack") contentInput.click();
  if (action === "restore-backup") backupInput.click();
  if (action === "load-sample") await loadSamplePack();
  if (action === "close-import") closeImportDialog();

  if (action === "confirm-import" && ui.pendingImport) {
    const { pack, lessons, summary } = ui.pendingImport;
    const hadContentPacks = state.packs.length > 0;
    await importContentPack(pack, lessons);
    if (!hadContentPacks) await saveSetting("activePackId", pack.id);
    closeImportDialog();
    await refreshState();
    applyAppearance();
    render();
    showToast(`${pack.title}: ${summary.added} new, ${summary.updated} updated.`);
  }

  if (action === "confirm-backup" && ui.pendingBackup) {
    await mergeBackup(ui.pendingBackup);
    closeImportDialog();
    await refreshState();
    applyAppearance();
    render();
    showToast("Backup merged successfully.");
  }

  if (action === "go-current") {
    ui.selectedLessonId = null;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "select-world") {
    ui.exploreWorldId = button.dataset.worldId;
    ui.exploreTerritoryId = "";
    ui.exploreSuggestionReason = "";
    renderExplore();
    requestAnimationFrame(() => document.querySelector("#territories")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (action === "open-explore-territory") {
    const territory = exploreTerritoryById.get(button.dataset.territoryId);
    if (!territory) return;
    ui.exploreTerritoryId = territory.id;
    ui.exploreWorldId = territory.worldId;
    ui.exploreSuggestionReason = "";
    ui.exploreDayIndex = territoryStats(territory.id).currentIndex;
    ui.view = "explore";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "back-explore") {
    ui.exploreTerritoryId = "";
    ui.exploreSuggestionReason = "";
    renderExplore();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "surprise-me") {
    const suggestion = chooseSomewhereNew();
    ui.view = "explore";
    ui.exploreWorldId = suggestion.territory.worldId;
    ui.exploreTerritoryId = suggestion.territory.id;
    ui.exploreDayIndex = territoryStats(suggestion.territory.id).currentIndex;
    ui.exploreSuggestionReason = suggestion.reason;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "start-territory") {
    const territory = exploreTerritoryById.get(button.dataset.territoryId);
    if (!territory) return;
    await recordExploreTerritory(territory.id);
    await refreshState();
    ui.exploreTerritoryId = territory.id;
    ui.exploreDayIndex = 0;
    ui.exploreSuggestionReason = "";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(`${territory.title} added to your Explore path.`);
  }

  if (action === "open-explore-day") {
    ui.exploreDayIndex = Number(button.dataset.dayIndex) || 0;
    renderExplore();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "view-insight-world") {
    ui.view = "explore";
    ui.exploreWorldId = button.dataset.worldId;
    ui.exploreTerritoryId = "";
    ui.exploreSuggestionReason = "";
    render();
    requestAnimationFrame(() => document.querySelector("#territories")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (action === "open-lesson") {
    const lessonId = button.dataset.lessonId;
    const exploreLesson = exploreLessonById.get(lessonId);
    if (exploreLesson) {
      ui.view = "explore";
      ui.exploreWorldId = exploreLesson.worldId;
      ui.exploreTerritoryId = exploreLesson.territoryId;
      ui.exploreDayIndex = exploreLesson.order - 1;
      ui.exploreSuggestionReason = "";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!await rememberLesson(lessonId)) return;
    ui.view = "today";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "open-lesson-in-pack") {
    if (!await rememberLesson(button.dataset.lessonId)) return;
    ui.view = "today";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "view-active-pack") {
    ui.view = "journey";
    ui.journeyPack = getActivePackId();
    ui.selectedLessonId = null;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "complete-lesson") {
    const lessonId = button.dataset.lessonId;
    const lesson = state.lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    const existing = progressMap().get(lessonId) || { lessonId };
    const actionNote = document.querySelector("#action-note")?.value.trim() ?? existing.actionNote ?? "";
    await saveProgress({ ...existing, actionNote, completedAt: new Date().toISOString() });
    const packLessons = lessonsForPack(lesson.packId);
    const lessonIndex = packLessons.findIndex((item) => item.id === lessonId);
    const progress = progressMap();
    const nextLesson = [
      ...packLessons.slice(lessonIndex + 1),
      ...packLessons.slice(0, lessonIndex),
    ].find((item) => !progress.get(item.id)?.completedAt);

    await saveSetting("activePackId", lesson.packId);
    await saveSetting(packCursorKey(lesson.packId), nextLesson?.id || lesson.id);
    await refreshState();
    ui.selectedLessonId = nextLesson?.id || lesson.id;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    celebrate();
    showToast(nextLesson ? "Lesson completed. Your next lesson is ready. +10 XP" : "Content pack completed. +10 XP");
  }

  if (action === "complete-explore-day") {
    const lesson = exploreLessonById.get(button.dataset.lessonId);
    if (!lesson) return;
    const existing = progressMap().get(lesson.id) || { lessonId: lesson.id };
    const actionNote = document.querySelector("#action-note")?.value.trim() ?? existing.actionNote ?? "";
    await saveProgress({ ...existing, actionNote, completedAt: new Date().toISOString() });
    await recordExploreTerritory(lesson.territoryId);
    await refreshState();
    const updatedStats = territoryStats(lesson.territoryId);
    const nextIndex = updatedStats.finished ? lesson.order - 1 : updatedStats.currentIndex;
    ui.exploreDayIndex = nextIndex;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    celebrate();
    showToast(updatedStats.finished ? "Territory completed. Your map is wider. +10 XP" : "Explore day completed. The next step is ready. +10 XP");
  }

  if (action === "rate-recall") {
    const lessonId = button.dataset.lessonId;
    const existing = progressMap().get(lessonId) || { lessonId };
    await saveProgress({ ...existing, recallRating: button.dataset.rating, recallRatedAt: new Date().toISOString() });
    await refreshState();
    render();
    showToast("Memory check saved.");
  }

  if (action === "toggle-action") {
    const lessonId = button.dataset.lessonId;
    const existing = progressMap().get(lessonId) || { lessonId };
    const wasComplete = Boolean(existing.actionCompletedAt);
    const actionNote = document.querySelector("#action-note")?.value.trim() ?? existing.actionNote ?? "";
    await saveProgress({ ...existing, actionNote, actionCompletedAt: wasComplete ? null : new Date().toISOString() });
    await refreshState();
    render();
    showToast(wasComplete ? "Action marked as not complete." : "Action completed. +10 XP");
  }

  if (action === "save-action-note") {
    const lessonId = button.dataset.lessonId;
    const existing = progressMap().get(lessonId) || { lessonId };
    const actionNote = document.querySelector("#action-note")?.value.trim() || "";
    await saveProgress({ ...existing, actionNote });
    await refreshState();
    updateShell();
    showToast(actionNote ? "Today’s action saved." : "Today’s action cleared.");
  }

  if (action === "save-reflection") {
    const lessonId = button.dataset.lessonId;
    const text = document.querySelector("#reflection-text")?.value.trim() || "";
    const hadReflection = Boolean(reflectionMap().get(lessonId)?.text?.trim());
    await saveReflection({ lessonId, text, updatedAt: new Date().toISOString() });
    await refreshState();
    updateShell();
    showToast(text ? `Reflection saved.${hadReflection ? "" : " +5 XP"}` : "Reflection removed.");
  }

  if (action === "set-setting") {
    await saveSetting(button.dataset.setting, button.dataset.value);
    await refreshState();
    applyAppearance();
    render();
  }

  if (action === "export-backup") {
    const backup = {
      type: "daily-growth-backup",
      schemaVersion: 1,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      packs: state.packs,
      lessons: state.lessons,
      progress: state.progress,
      reflections: state.reflections,
      settings: state.settings,
    };
    downloadJson(`daily-growth-backup-${localDateKey()}.json`, backup);
    showToast("Full backup downloaded.");
  }

  if (action === "remove-pack") {
    const pack = state.packs.find((item) => item.id === button.dataset.packId);
    if (!pack) return;
    showConfirm(
      `Remove ${pack.title}?`,
      "Its lessons will leave this device. Saved progress and reflections are retained and will reconnect if you import the pack again.",
      "Remove pack",
      async () => {
        const wasActive = getActivePackId() === pack.id;
        await removePackContent(pack.id);
        await refreshState();
        if (wasActive) {
          await saveSetting("activePackId", orderedPacks()[0]?.id || "");
          await refreshState();
        }
        ui.selectedLessonId = null;
        render();
        showToast(`${pack.title} removed.`);
      },
    );
  }

  if (action === "clear-all") {
    showConfirm(
      "Erase all local data?",
      "This removes content packs, Explore progress, reflections and settings from this browser. This cannot be undone without a backup.",
      "Erase everything",
      async () => {
        await clearAllData();
        await refreshState();
        ui.view = "today";
        ui.selectedLessonId = null;
        applyAppearance();
        render();
        showToast("Local Daily Growth data erased.");
      },
    );
  }
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    ui.view = viewButton.dataset.view;
    ui.selectedLessonId = null;
    if (ui.view === "explore") {
      ui.exploreTerritoryId = "";
      ui.exploreSuggestionReason = "";
    }
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    try {
      await handleAction(actionButton);
    } catch (error) {
      console.error(error);
      showToast(error.message || "Something went wrong. Please try again.", "error");
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "journey-search") {
    ui.journeySearch = event.target.value;
    renderJourney();
    document.querySelector("#journey-search")?.focus();
    const search = document.querySelector("#journey-search");
    if (search) search.setSelectionRange(search.value.length, search.value.length);
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.id === "journey-pack-filter") {
    ui.journeyPack = event.target.value;
    if (ui.journeyPack !== "all") {
      const pack = await selectActivePack(ui.journeyPack);
      if (pack) showToast(`${pack.title} is now your current content pack.`);
    }
    renderJourney();
  }
  if (event.target.id === "today-pack-select") {
    const pack = await selectActivePack(event.target.value);
    ui.view = "today";
    render();
    if (pack) showToast(`Continuing ${pack.title}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (event.target.id === "settings-active-pack") {
    const pack = await selectActivePack(event.target.value);
    renderSettings();
    if (pack) showToast(`${pack.title} is now your current content pack.`);
  }
});

contentInput.addEventListener("change", async () => {
  await readJsonFile(contentInput.files?.[0], "content");
  contentInput.value = "";
});

backupInput.addEventListener("change", async () => {
  await readJsonFile(backupInput.files?.[0], "backup");
  backupInput.value = "";
});

document.querySelector("#confirm-cancel").addEventListener("click", () => confirmDialog.close());
confirmAccept.addEventListener("click", async () => {
  const callback = ui.confirmAction;
  ui.confirmAction = null;
  confirmDialog.close();
  if (callback) {
    try {
      await callback();
    } catch (error) {
      console.error(error);
      showToast(error.message || "The change could not be completed.", "error");
    }
  }
});

quickTheme.addEventListener("click", async () => {
  const current = document.documentElement.dataset.theme;
  await saveSetting("theme", current === "dark" ? "light" : "dark");
  await refreshState();
  applyAppearance();
  render();
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getSetting("theme") === "system") applyAppearance();
});

async function initialize() {
  try {
    if (!("indexedDB" in window)) throw new Error("This browser does not support the local storage Daily Growth needs.");
    await openDatabase();
    await refreshState();
    applyAppearance();
    render();

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker registration failed", error));
    }
  } catch (error) {
    console.error(error);
    main.innerHTML = `<section class="fatal-error"><span aria-hidden="true">!</span><h2>Daily Growth could not start</h2><p>${escapeHtml(error.message)}</p><button class="button primary" onclick="location.reload()">Try again</button></section>`;
  }
}

initialize();
