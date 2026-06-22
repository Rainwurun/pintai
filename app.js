const state = {
  games: [],
  localGames: [],
  view: "all",
  search: "",
  category: "all",
  sort: "updated",
  plays: {},
  musicPlaying: false,
  audioContext: null,
  musicTimer: null,
  developerMode: false
};

const PLATFORM = {
  creator: "吴润",
  version: "v1.1.0",
  musicTitle: "Dock Pulse",
  musicLicense: "CC0 / WebAudio original"
};

const STORAGE_KEYS = {
  localGames: "gamedock.localGames",
  plays: "gamedock.plays",
  recent: "gamedock.recent",
  musicEnabled: "gamedock.musicEnabled"
};

const elements = {
  grid: document.querySelector("#gameGrid"),
  spotlight: document.querySelector("#spotlight"),
  totalGames: document.querySelector("#totalGames"),
  totalCategories: document.querySelector("#totalCategories"),
  categoryFilter: document.querySelector("#categoryFilter"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  libraryTitle: document.querySelector("#libraryTitle"),
  resultCount: document.querySelector("#resultCount"),
  dialog: document.querySelector("#gameDialog"),
  form: document.querySelector("#gameForm"),
  emptyTemplate: document.querySelector("#emptyStateTemplate"),
  musicButton: document.querySelector("#musicButton"),
  openAddDialog: document.querySelector("#openAddDialog"),
  exportButton: document.querySelector("#exportButton"),
  exitDeveloperMode: document.querySelector("#exitDeveloperMode")
};

const fallbackGames = [
  {
    id: "pixel-runner",
    title: "Pixel Runner",
    description: "一款节奏很快的横版躲避小游戏示例。",
    category: "动作",
    tags: ["像素", "反应", "单人"],
    url: "https://example.com/pixel-runner",
    repo: "",
    cover: "",
    featured: true,
    updatedAt: "2026-06-22",
    source: "sample"
  },
  {
    id: "number-lab",
    title: "Number Lab",
    description: "数字推理和限时挑战组合的益智小游戏示例。",
    category: "益智",
    tags: ["数字", "计时", "脑力"],
    url: "https://example.com/number-lab",
    repo: "",
    cover: "",
    featured: false,
    updatedAt: "2026-06-19",
    source: "sample"
  }
];

init();

async function init() {
  state.developerMode = resolveDeveloperMode();
  state.localGames = readJson(STORAGE_KEYS.localGames, []);
  state.plays = readJson(STORAGE_KEYS.plays, {});
  state.games = await loadGames();
  renderPlatformInfo();
  renderDeveloperMode();
  bindEvents();
  populateCategories();
  render();
}

async function loadGames() {
  try {
    const response = await fetch("games.json", { cache: "no-store" });
    if (!response.ok) throw new Error("games.json not found");
    const games = await response.json();
    return normalizeGames(Array.isArray(games) ? games : games.games || []);
  } catch (error) {
    return normalizeGames(fallbackGames);
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".nav-button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      render();
    });
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    render();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });

  elements.openAddDialog.addEventListener("click", () => {
    elements.dialog.showModal();
  });

  document.querySelector("#closeDialog").addEventListener("click", () => {
    elements.dialog.close();
  });

  document.querySelector("#copyJsonButton").addEventListener("click", async () => {
    const game = gameFromForm(new FormData(elements.form));
    await copyText(JSON.stringify(game, null, 2));
  });

  elements.exportButton.addEventListener("click", exportGames);
  elements.exitDeveloperMode.addEventListener("click", exitDeveloperMode);
  elements.musicButton.addEventListener("click", toggleMusic);

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const game = gameFromForm(new FormData(elements.form));
    state.localGames = [game, ...state.localGames.filter((item) => item.id !== game.id)];
    writeJson(STORAGE_KEYS.localGames, state.localGames);
    populateCategories();
    elements.form.reset();
    elements.dialog.close();
    render();
  });
}

function renderPlatformInfo() {
  document.querySelector("#platformVersion").textContent = PLATFORM.version;
  document.querySelector("#platformCreator").textContent = PLATFORM.creator;
  document.querySelector("#topbarCreator").textContent = PLATFORM.creator;
  document.querySelector("#topbarVersion").textContent = PLATFORM.version;
  document.querySelector("#musicCredit").textContent = `BGM: ${PLATFORM.musicTitle} · ${PLATFORM.musicLicense}`;
  elements.musicButton.title = `${PLATFORM.musicTitle} · ${PLATFORM.musicLicense}`;
}

function renderDeveloperMode() {
  document.body.classList.toggle("is-developer", state.developerMode);
  if (!state.developerMode && state.view === "local") {
    state.view = "all";
  }
}

function render() {
  const games = getAllGames();
  const categories = new Set(games.map((game) => game.category).filter(Boolean));
  elements.totalGames.textContent = games.length;
  elements.totalCategories.textContent = categories.size;
  renderSpotlight(games);

  const filtered = filterGames(games);
  elements.libraryTitle.textContent = viewTitle();
  elements.resultCount.textContent = `${filtered.length} 个游戏`;
  elements.grid.replaceChildren();

  if (!filtered.length) {
    elements.grid.append(elements.emptyTemplate.content.cloneNode(true));
    return;
  }

  filtered.forEach((game) => elements.grid.append(createGameCard(game)));
}

function getAllGames() {
  const map = new Map();
  const visibleGames = state.developerMode ? [...state.games, ...state.localGames] : state.games;
  visibleGames.forEach((game) => map.set(game.id, game));
  return Array.from(map.values());
}

function filterGames(games) {
  const recentIds = readJson(STORAGE_KEYS.recent, []);
  return games
    .filter((game) => {
      if (state.view === "featured" && !game.featured) return false;
      if (state.view === "recent" && !recentIds.includes(game.id)) return false;
      if (state.view === "local" && game.source !== "local") return false;
      if (state.category !== "all" && game.category !== state.category) return false;
      if (!state.search) return true;
      const haystack = [
        game.title,
        game.description,
        game.category,
        ...(game.tags || [])
      ].join(" ").toLowerCase();
      return haystack.includes(state.search);
    })
    .sort((a, b) => {
      if (state.sort === "title") return a.title.localeCompare(b.title, "zh-CN");
      if (state.sort === "plays") return playCount(b.id) - playCount(a.id);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
}

function renderSpotlight(games) {
  const featured = games.find((game) => game.featured) || games[0];
  if (!featured) {
    elements.spotlight.hidden = true;
    return;
  }

  elements.spotlight.hidden = false;
  elements.spotlight.innerHTML = "";
  const copy = document.createElement("div");
  copy.className = "spotlight-copy";
  copy.innerHTML = `
    <p class="eyebrow">精选启动</p>
    <h2>${escapeHtml(featured.title)}</h2>
    <p>${escapeHtml(featured.description)}</p>
    <a class="play-link" href="${featured.url}" target="_blank" rel="noreferrer" data-play="${featured.id}">开始游玩</a>
  `;

  const art = document.createElement("div");
  art.className = "spotlight-art";
  if (featured.cover) art.style.backgroundImage = `url("${cssUrl(featured.cover)}")`;
  elements.spotlight.append(copy, art);
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const cover = document.createElement("div");
  cover.className = "game-cover";
  if (game.cover) cover.style.backgroundImage = `url("${cssUrl(game.cover)}")`;

  const body = document.createElement("div");
  body.className = "game-body";
  body.innerHTML = `
    <div class="game-title-row">
      <div>
        <h3>${escapeHtml(game.title)}</h3>
        <div class="game-meta">${escapeHtml(game.category)} · ${playCount(game.id)} 次游玩</div>
      </div>
      ${game.featured ? '<span class="badge">推荐</span>' : ""}
    </div>
    <p class="game-description">${escapeHtml(game.description)}</p>
    <div class="tag-list">${(game.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="game-actions">
      <a class="play-link" href="${game.url}" target="_blank" rel="noreferrer" data-play="${game.id}">启动</a>
      ${game.repo ? `<a class="repo-link" href="${game.repo}" target="_blank" rel="noreferrer" title="打开仓库">↗</a>` : ""}
    </div>
  `;
  card.append(cover, body);
  card.querySelectorAll("[data-play]").forEach((link) => {
    link.addEventListener("click", () => recordPlay(game.id));
  });
  return card;
}

function populateCategories() {
  const current = state.category;
  const categories = Array.from(new Set(getAllGames().map((game) => game.category).filter(Boolean))).sort((a, b) => {
    return a.localeCompare(b, "zh-CN");
  });
  elements.categoryFilter.innerHTML = '<option value="all">全部分类</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.append(option);
  });
  elements.categoryFilter.value = categories.includes(current) ? current : "all";
  state.category = elements.categoryFilter.value;
}

function gameFromForm(formData) {
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const tags = String(formData.get("tags") || "")
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    id: slugify(`${title}-${category}`),
    title,
    description: String(formData.get("description") || "").trim(),
    category,
    tags,
    url,
    repo: String(formData.get("repo") || "").trim(),
    cover: String(formData.get("cover") || "").trim(),
    featured: formData.get("featured") === "on",
    updatedAt: new Date().toISOString().slice(0, 10),
    source: "local"
  };
}

function normalizeGames(games) {
  return games.map((game, index) => ({
    id: game.id || slugify(`${game.title || "game"}-${index}`),
    title: game.title || "未命名游戏",
    description: game.description || "暂无简介。",
    category: game.category || "未分类",
    tags: Array.isArray(game.tags) ? game.tags : [],
    url: game.url || "#",
    repo: game.repo || "",
    cover: game.cover || "",
    featured: Boolean(game.featured),
    updatedAt: game.updatedAt || "2026-06-22",
    source: game.source || "json"
  }));
}

function recordPlay(id) {
  state.plays[id] = playCount(id) + 1;
  writeJson(STORAGE_KEYS.plays, state.plays);
  const recent = readJson(STORAGE_KEYS.recent, []).filter((item) => item !== id);
  writeJson(STORAGE_KEYS.recent, [id, ...recent].slice(0, 12));
}

async function toggleMusic() {
  if (state.musicPlaying) {
    stopMusic();
    return;
  }

  await startMusic();
}

async function startMusic() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  await state.audioContext.resume();
  state.musicPlaying = true;
  writeJson(STORAGE_KEYS.musicEnabled, true);
  elements.musicButton.classList.add("is-on");
  scheduleMusicLoop();
}

function stopMusic() {
  state.musicPlaying = false;
  writeJson(STORAGE_KEYS.musicEnabled, false);
  elements.musicButton.classList.remove("is-on");
  window.clearTimeout(state.musicTimer);
  state.musicTimer = null;
}

function scheduleMusicLoop() {
  if (!state.musicPlaying || !state.audioContext) return;

  const now = state.audioContext.currentTime;
  const melody = [392, 494, 587, 494, 659, 587, 494, 440];
  const bass = [98, 123.47, 146.83, 123.47];
  melody.forEach((frequency, index) => {
    playTone(frequency, now + index * 0.28, 0.18, "triangle", 0.045);
  });
  bass.forEach((frequency, index) => {
    playTone(frequency, now + index * 0.56, 0.42, "sine", 0.05);
  });

  state.musicTimer = window.setTimeout(scheduleMusicLoop, 2240);
}

function playTone(frequency, start, duration, type, volume) {
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(state.audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playCount(id) {
  return Number(state.plays[id] || 0);
}

function resolveDeveloperMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("dev") === "1";
}

function exitDeveloperMode() {
  state.developerMode = false;
  renderDeveloperMode();
  populateCategories();
  render();
  const url = new URL(window.location.href);
  url.searchParams.delete("dev");
  window.history.replaceState({}, "", url);
}

function exportGames() {
  const data = JSON.stringify({ games: getAllGames().map(({ source, ...game }) => game) }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "games.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function viewTitle() {
  return {
    all: "全部游戏",
    featured: "推荐游戏",
    recent: "最近游玩",
    local: "本地添加"
  }[state.view];
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || `game-${Date.now()}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function cssUrl(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}
