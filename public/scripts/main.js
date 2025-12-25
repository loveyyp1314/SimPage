import { renderMarkdown } from "./markdown.js";
import "./theme-toggle.js";

const siteNameElement = document.getElementById("site-name");
const timeElement = document.getElementById("current-time");
const dateElement = document.getElementById("current-date");
const greetingElement = document.getElementById("greeting-text");
const weatherElement = document.getElementById("weather-info");
const appsGrid = document.getElementById("apps-grid");
const bookmarksGrid = document.getElementById("bookmarks-grid");
const appsEmpty = document.getElementById("apps-empty");
const bookmarksEmpty = document.getElementById("bookmarks-empty");
const appsPanel = document.getElementById("apps-panel");
const bookmarksPanel = document.getElementById("bookmarks-panel");
const collectionToggle = document.getElementById("collection-toggle");
const collectionToggleButtons = collectionToggle
  ? Array.from(collectionToggle.querySelectorAll(".collection-toggle-button"))
  : [];
const searchForm = document.getElementById("global-search-form");
const searchInput = document.getElementById("global-search");
const searchTargetSelect = document.getElementById("search-target");
const searchEngineInput = document.getElementById("search-engine");
const searchEngineWrapper = document.querySelector('.search-select[data-control="engine"]');
const searchEngineButtons = searchEngineWrapper
  ? Array.from(searchEngineWrapper.querySelectorAll(".search-engine-button"))
  : [];
const searchFeedback = document.getElementById("local-search-feedback");
const backToTopButton = document.getElementById("back-to-top");
const footerElement = document.getElementById("site-footer");
const footerContentElement = document.getElementById("site-footer-content");
const footerMetaElement = document.getElementById("site-footer-meta");
const visitorCountElement = document.getElementById("site-visitor-count");
const faviconLink = document.getElementById("site-favicon");

const collectionPanels = {
  apps: appsPanel,
  bookmarks: bookmarksPanel,
};

function replaceChildrenSafe(target, ...nodes) {
  if (!target) return;
  if (typeof target.replaceChildren === "function") {
    target.replaceChildren(...nodes);
    return;
  }
  target.innerHTML = "";
  nodes.forEach((node) => {
    if (node) {
      target.appendChild(node);
    }
  });
}

const defaultDocumentTitle = document.title || "SimPage";
const defaultSiteName = siteNameElement?.textContent?.trim() || defaultDocumentTitle || "SimPage";
const defaultWeather = {
  city: "北京",
};
const DEFAULT_SITE_SETTINGS = {
  siteName: defaultSiteName,
  siteLogo: "",
  greeting: "",
  footer: "",
  weather: { ...defaultWeather },
};

const defaultFaviconHref = faviconLink?.getAttribute("href") || "data:,";
const defaultFaviconType = faviconLink?.getAttribute("type") || "";
const defaultFaviconSizes = faviconLink?.getAttribute("sizes") || "";
const DEFAULT_FAVICON_SYMBOL = "🧭";
const faviconCache = new Map();
const BACK_TO_TOP_THRESHOLD = 320;

let customGreeting = "";
let yiyanMessage = "";
let footerContentValue = "";
let visitorCountKnown = false;
let visitorCountValue = 0;

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const visitorCountFormatter = new Intl.NumberFormat("zh-CN");

const runtimeConfig = {
  weather: {
    defaultCity: defaultWeather.city,
  },
};

let activeWeather = { city: runtimeConfig.weather.defaultCity };
let weatherSource = "default";
let weatherRequestToken = 0;

const appsEmptyDefault = appsEmpty ? appsEmpty.textContent : "";
const bookmarksEmptyDefault = bookmarksEmpty ? bookmarksEmpty.textContent : "";

const originalData = {
  apps: [],
  bookmarks: [],
};

let currentSearchTarget = "web";
let activeCollection = "apps";

const searchEngineBuilders = {
  google: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  baidu: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
  bing: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
};

function normaliseFooterValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}

function setSearchEngine(engine) {
  if (!searchEngineInput) return;
  const resolved = Object.prototype.hasOwnProperty.call(searchEngineBuilders, engine)
    ? engine
    : "google";
  searchEngineInput.value = resolved;
  searchEngineButtons.forEach((button) => {
    const isActive = button.dataset.engineOption === resolved;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    const tabIndex = searchEngineInput.disabled ? "-1" : isActive ? "0" : "-1";
    button.setAttribute("tabindex", tabIndex);
  });
}

function moveSearchEngineSelection(offset) {
  if (!searchEngineButtons.length || searchEngineInput?.disabled) {
    return;
  }
  const enabledButtons = searchEngineButtons.filter((button) => !button.disabled);
  if (!enabledButtons.length) {
    return;
  }
  const currentValue = searchEngineInput?.value || "google";
  let currentIndex = enabledButtons.findIndex(
    (button) => button.dataset.engineOption === currentValue
  );
  if (currentIndex < 0) {
    currentIndex = 0;
  }
  const nextIndex = (currentIndex + offset + enabledButtons.length) % enabledButtons.length;
  const nextButton = enabledButtons[nextIndex];
  if (!nextButton) {
    return;
  }
  const nextValue = nextButton.dataset.engineOption;
  if (!nextValue) {
    return;
  }
  setSearchEngine(nextValue);
  nextButton.focus();
}

function updateClock() {
  const now = new Date();
  if (timeElement) {
    timeElement.textContent = timeFormatter.format(now);
  }
  if (dateElement) {
    dateElement.textContent = dateFormatter.format(now);
  }
  updateGreetingDisplay(now.getHours());
}

function getGreeting(hour) {
  if (hour < 5) return "夜深了，注意休息";
  if (hour < 9) return "早上好，开启活力新一天";
  if (hour < 12) return "上午好，继续保持效率";
  if (hour < 14) return "中午好，记得适当放松";
  if (hour < 18) return "下午好，进展顺利";
  if (hour < 22) return "晚上好，辛苦啦";
  return "夜深了，注意休息";
}

function updateGreetingDisplay(hour = new Date().getHours()) {
  if (!greetingElement) return;

  const hasCustomGreeting = Boolean(customGreeting);
  const shouldUseYiyan = !hasCustomGreeting && Boolean(yiyanMessage);

  if (greetingElement.classList) {
    greetingElement.classList.toggle("is-yiyan", shouldUseYiyan);
  }

  if (hasCustomGreeting) {
    greetingElement.textContent = customGreeting;
    return;
  }
  if (shouldUseYiyan) {
    greetingElement.textContent = yiyanMessage;
    return;
  }
  greetingElement.textContent = getGreeting(hour);
}

async function loadData() {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) {
      throw new Error("数据拉取失败");
    }
    const payload = await response.json();
    const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;

    applySiteSettings(data?.settings);
    updateVisitorCount(data?.visitorCount);
    applyRuntimeConfig(data?.config);

    originalData.apps = prepareCollection(data?.apps, "apps");
    originalData.bookmarks = prepareCollection(data?.bookmarks, "bookmarks");
    renderApps(originalData.apps);
    renderBookmarks(originalData.bookmarks);
    hideLocalSearchFeedback();
  } catch (error) {
    console.error("加载数据失败", error);
    renderApps([], { emptyMessage: "加载应用数据失败，请稍后重试。" });
    renderBookmarks([], { emptyMessage: "加载书签数据失败，请稍后重试。" });
    hideLocalSearchFeedback();
  }
}

function prepareCollection(collection, type) {
  if (!Array.isArray(collection)) return [];
  return collection.map((item) => ({
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "",
    url: typeof item.url === "string" ? item.url : "",
    description: typeof item.description === "string" ? item.description : "",
    icon: typeof item.icon === "string" ? item.icon : "",
    ...(type === "bookmarks"
      ? { category: typeof item.category === "string" ? item.category : "" }
      : {}),
  }));
}

function prepareSiteSettings(settings) {
  const prepared = {
    ...DEFAULT_SITE_SETTINGS,
    weather: { ...DEFAULT_SITE_SETTINGS.weather },
  };
  if (!settings || typeof settings !== "object") {
    return prepared;
  }
  if (typeof settings.siteName === "string" && settings.siteName.trim()) {
    prepared.siteName = settings.siteName.trim();
  }
  if (typeof settings.siteLogo === "string") {
    prepared.siteLogo = settings.siteLogo.trim();
  }
  if (typeof settings.greeting === "string") {
    prepared.greeting = settings.greeting.trim();
  }
  if (typeof settings.footer === "string") {
    prepared.footer = normaliseFooterValue(settings.footer);
  }

  const weather = normaliseWeatherSetting(settings.weather);
  if (weather) {
    prepared.weather = weather;
  } else if (settings.weatherLocation) {
    const legacyWeather = normaliseWeatherSetting(settings.weatherLocation);
    if (legacyWeather) {
      prepared.weather = legacyWeather;
    }
  }

  return prepared;
}

function applySiteSettings(settings) {
  const prepared = prepareSiteSettings(settings);
  customGreeting = prepared.greeting;

  if (siteNameElement) {
    siteNameElement.textContent = prepared.siteName;
  }
  updateDocumentTitle(prepared.siteName);
  updateFavicon(prepared.siteLogo, prepared.siteName);
  updateGreetingDisplay();
  updateFooter(prepared.footer);
  setActiveWeather(prepared.weather, { source: "settings" });
}

function updateDocumentTitle(siteName) {
  const clean = typeof siteName === "string" ? siteName.trim() : "";
  document.title = clean || defaultDocumentTitle;
}

function applyDefaultFavicon() {
  if (!faviconLink) return false;
  if (!defaultFaviconHref || defaultFaviconHref === "data:,") {
    return false;
  }
  faviconLink.href = defaultFaviconHref;
  if (defaultFaviconType) {
    faviconLink.setAttribute("type", defaultFaviconType);
  } else {
    faviconLink.removeAttribute("type");
  }
  if (defaultFaviconSizes) {
    faviconLink.setAttribute("sizes", defaultFaviconSizes);
  } else {
    faviconLink.removeAttribute("sizes");
  }
  return true;
}

function updateFavicon(rawValue, siteName) {
  if (!faviconLink) return;
  const cleanValue = typeof rawValue === "string" ? rawValue.trim() : "";

  if (cleanValue) {
    if (isLogoUrl(cleanValue)) {
      faviconLink.href = cleanValue;
      faviconLink.removeAttribute("type");
      faviconLink.removeAttribute("sizes");
      return;
    }

    const emojiUrl = createEmojiFavicon(cleanValue);
    if (emojiUrl) {
      faviconLink.href = emojiUrl;
      faviconLink.setAttribute("type", "image/png");
      faviconLink.setAttribute("sizes", "64x64");
      return;
    }
  }

  if (applyDefaultFavicon()) {
    return;
  }

  const fallbackUrl = createEmojiFavicon(deriveFaviconSymbol(siteName));
  if (fallbackUrl) {
    faviconLink.href = fallbackUrl;
    faviconLink.setAttribute("type", "image/png");
    faviconLink.setAttribute("sizes", "64x64");
    return;
  }

  if (defaultFaviconHref) {
    faviconLink.href = defaultFaviconHref;
  } else {
    faviconLink.href = "data:,";
  }
  faviconLink.removeAttribute("type");
  faviconLink.removeAttribute("sizes");
}

function updateFooter(rawContent) {
  if (!footerElement || !footerContentElement) return;
  const clean = normaliseFooterValue(rawContent);
  footerContentValue = clean;
  if (!clean) {
    footerContentElement.innerHTML = "";
    footerContentElement.setAttribute("hidden", "");
  } else {
    footerContentElement.innerHTML = renderMarkdown(clean);
    footerContentElement.removeAttribute("hidden");
  }
  refreshFooterVisibility();
}

function updateVisitorCount(rawValue) {
  if (!footerElement || !footerMetaElement || !visitorCountElement) return;
  const numericValue = Number(rawValue);
  visitorCountValue =
    Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : 0;
  visitorCountKnown = true;
  visitorCountElement.textContent = visitorCountFormatter.format(visitorCountValue);
  footerMetaElement.hidden = false;
  refreshFooterVisibility();
}

function refreshFooterVisibility() {
  if (!footerElement) return;
  const hasContent = Boolean(footerContentValue);
  const shouldShowFooter = hasContent || visitorCountKnown;
  footerElement.hidden = !shouldShowFooter;
}

function deriveFaviconSymbol(siteName) {
  if (typeof siteName === "string" && siteName.trim()) {
    const units = Array.from(siteName.trim());
    if (units.length > 0) {
      return units[0];
    }
  }
  return DEFAULT_FAVICON_SYMBOL;
}

function createEmojiFavicon(symbolValue) {
  const base = typeof symbolValue === "string" ? symbolValue.trim() : "";
  const units = base ? Array.from(base) : [];
  const symbol = units.length > 0 ? units[0] : DEFAULT_FAVICON_SYMBOL;

  if (faviconCache.has(symbol)) {
    return faviconCache.get(symbol);
  }

  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = "rgba(0, 0, 0, 0)";
  context.fillRect(0, 0, size, size);
  context.font = `${Math.round(size * 0.7)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#111827";
  context.fillText(symbol, size / 2, size / 2);

  const dataUrl = canvas.toDataURL("image/png");
  faviconCache.set(symbol, dataUrl);
  return dataUrl;
}

function isLogoUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:");
}

function showCollection(view, { focusTab = false } = {}) {
  if (view !== "apps" && view !== "bookmarks") {
    return;
  }
  activeCollection = view;

  collectionToggleButtons.forEach((button) => {
    const target = button.dataset.view;
    const isActive = target === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("tabindex", isActive ? "0" : "-1");
    if (isActive && focusTab) {
      button.focus();
    }
  });

  Object.entries(collectionPanels).forEach(([key, panel]) => {
    if (!panel) return;
    const isActive = key === view;
    panel.classList.toggle("is-active", isActive);
    if (isActive) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
    }
  });
}

function renderApps(items, options = {}) {
  renderTileGrid(appsGrid, appsEmpty, items, {
    emptyMessage: options.emptyMessage,
    defaultMessage: appsEmptyDefault,
  });
}

function renderTileGrid(container, emptyHint, items, { emptyMessage, defaultMessage } = {}) {
  if (!container || !emptyHint) return;

  if (!Array.isArray(items) || !items.length) {
    replaceChildrenSafe(container);
    emptyHint.hidden = false;
    if (emptyMessage) {
      emptyHint.textContent = emptyMessage;
    } else if (typeof defaultMessage === "string") {
      emptyHint.textContent = defaultMessage;
    }
    return;
  }

  emptyHint.hidden = true;
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.appendChild(createTile(item));
  }
  replaceChildrenSafe(container, fragment);
}

function renderBookmarks(items, options = {}) {
  if (!bookmarksGrid || !bookmarksEmpty) return;

  if (!Array.isArray(items) || !items.length) {
    replaceChildrenSafe(bookmarksGrid);
    bookmarksEmpty.hidden = false;
    if (options.emptyMessage) {
      bookmarksEmpty.textContent = options.emptyMessage;
    } else {
      bookmarksEmpty.textContent = bookmarksEmptyDefault;
    }
    return;
  }

  bookmarksEmpty.hidden = true;
  const groups = groupBookmarksByCategory(items);
  const gridFragment = document.createDocumentFragment();

  groups.forEach((group) => {
    const groupElement = document.createElement("section");
    groupElement.className = "bookmark-group";

    const shouldShowTitle = !group.isUncategorised || groups.length > 1;
    if (shouldShowTitle) {
      const title = document.createElement("h3");
      title.className = "bookmark-group-title";
      title.textContent = group.label;
      groupElement.appendChild(title);
    }

    const list = document.createElement("div");
    list.className = "grid";
    list.setAttribute("role", "list");

    const tilesFragment = document.createDocumentFragment();
    group.items.forEach((item) => {
      tilesFragment.appendChild(createTile(item));
    });
    list.appendChild(tilesFragment);

    groupElement.appendChild(list);
    gridFragment.appendChild(groupElement);
  });

  replaceChildrenSafe(bookmarksGrid, gridFragment);
}

function groupBookmarksByCategory(items) {
  const groups = [];
  const map = new Map();

  items.forEach((item) => {
    const rawLabel = typeof item.category === "string" ? item.category.trim() : "";
    const key = rawLabel.toLowerCase() || "__uncategorised__";
    let group = map.get(key);

    if (!group) {
      group = {
        key,
        label: rawLabel || "未分类",
        items: [],
        isUncategorised: !rawLabel,
      };
      map.set(key, group);
      groups.push(group);
    }

    group.items.push(item);
  });

  return groups;
}

function createTile(item) {
  const link = document.createElement("a");
  link.className = "tile";
  link.href = normalizeUrl(item.url);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("role", "listitem");

  const iconWrapper = document.createElement("span");
  iconWrapper.className = "tile-icon";
  const iconContent = String(item.icon || "").trim();

  if (iconContent.startsWith("http://") || iconContent.startsWith("https://") || iconContent.startsWith("data:")) {
    const img = document.createElement("img");
    img.src = iconContent;
    img.alt = `${item.name || ""} 图标`;
    iconWrapper.appendChild(img);
  } else if (iconContent.length > 0) {
    iconWrapper.textContent = iconContent.slice(0, 4);
  } else {
    iconWrapper.textContent = deriveFallbackIcon(item.name);
  }

  const title = document.createElement("h3");
  title.className = "tile-title";
  title.textContent = item.name || "未命名";

  const description = document.createElement("p");
  description.className = "tile-description";
  const descriptionText = typeof item.description === "string" ? item.description.trim() : "";
  if (descriptionText) {
    description.textContent = descriptionText;
  } else {
    description.classList.add("is-empty");
    description.setAttribute("aria-hidden", "true");
  }

  link.appendChild(iconWrapper);
  link.appendChild(title);
  link.appendChild(description);

  return link;
}

function deriveFallbackIcon(name) {
  if (!name) return "★";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "★";
}

function normalizeUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function performLocalSearch(target, query) {
  if (target !== "apps" && target !== "bookmarks") {
    return;
  }
  const trimmed = query.trim();
  if (!trimmed) {
    showCollection(target);
    clearLocalSearchResults();
    return;
  }

  showCollection(target);

  const dataset = target === "apps" ? originalData.apps : originalData.bookmarks;
  const keywords = trimmed.toLowerCase();

  const matches = dataset.filter((item) => {
    const pack = [item.name, item.description];
    if (target === "bookmarks") {
      pack.push(item.category);
    }
    return pack
      .filter((value) => typeof value === "string" && value)
      .some((value) => value.toLowerCase().includes(keywords));
  });

  if (target === "apps") {
    renderApps(matches, { emptyMessage: `未找到与「${trimmed}」匹配的应用。` });
    renderBookmarks(originalData.bookmarks);
  } else {
    renderApps(originalData.apps);
    renderBookmarks(matches, { emptyMessage: `未找到与「${trimmed}」匹配的书签。` });
  }

  updateLocalSearchFeedback(matches.length, target, trimmed);
}

function clearLocalSearchResults() {
  renderApps(originalData.apps);
  renderBookmarks(originalData.bookmarks);
  hideLocalSearchFeedback();
  showCollection(activeCollection);
}

function updateLocalSearchFeedback(count, target, query) {
  if (!searchFeedback) return;
  const label = target === "apps" ? "应用" : "书签";
  const message = count
    ? `共找到 ${count} 条${label}结果，关键词：${query}`
    : `未找到与「${query}」匹配的${label}。`;
  searchFeedback.textContent = message;
  searchFeedback.hidden = false;
}

function hideLocalSearchFeedback() {
  if (!searchFeedback) return;
  searchFeedback.hidden = true;
  searchFeedback.textContent = "";
}

function handleSearchSubmit(event) {
  if (!searchForm || !searchTargetSelect || !searchInput) return;
  event.preventDefault();

  const query = searchInput.value.trim();
  const target = searchTargetSelect.value;

  if (!query) {
    if (target === "web") {
      return;
    }
    clearLocalSearchResults();
    return;
  }

  if (target === "web") {
    const engineKey = searchEngineInput ? searchEngineInput.value : "google";
    const builder = searchEngineBuilders[engineKey] || searchEngineBuilders.google;
    const url = builder(query);
    window.open(url, "_blank", "noopener");
    hideLocalSearchFeedback();
    return;
  }

  performLocalSearch(target, query);
}

function updateSearchControls() {
  if (!searchTargetSelect) return;
  const nextTarget = searchTargetSelect.value;
  const isWebSearch = nextTarget === "web";

  if (searchEngineWrapper) {
    searchEngineWrapper.hidden = !isWebSearch;
  }
  if (searchEngineInput) {
    searchEngineInput.disabled = !isWebSearch;
  }
  if (searchEngineButtons.length) {
    searchEngineButtons.forEach((button) => {
      button.disabled = !isWebSearch;
    });
  }
  if (searchEngineInput) {
    setSearchEngine(searchEngineInput.value || "google");
  }

  const hasChanged = currentSearchTarget !== nextTarget;
  currentSearchTarget = nextTarget;

  if (isWebSearch) {
    if (hasChanged) {
      clearLocalSearchResults();
    } else {
      hideLocalSearchFeedback();
    }
    return;
  }

  showCollection(nextTarget);

  if (!searchInput) return;

  if (searchInput.value.trim()) {
    performLocalSearch(nextTarget, searchInput.value);
  } else if (hasChanged) {
    clearLocalSearchResults();
  }
}

function formatYiyanQuote(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const sentence = typeof payload.hitokoto === "string" ? payload.hitokoto.trim() : "";
  if (!sentence) {
    return "";
  }
  const sources = [];
  const fromWho = typeof payload.from_who === "string" ? payload.from_who.trim() : "";
  const origin = typeof payload.from === "string" ? payload.from.trim() : "";
  if (fromWho) {
    sources.push(fromWho);
  }
  if (origin && sources.indexOf(origin) === -1) {
    sources.push(origin);
  }
  if (!sources.length) {
    return sentence;
  }
  return `${sentence} —— ${sources.join(" · ")}`;
}

async function loadYiyanQuote() {
  if (!greetingElement) return;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId = null;
  try {
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), 5000);
    }
    const options = { cache: "no-cache" };
    if (controller) {
      options.signal = controller.signal;
    }
    const response = await fetch("https://v1.hitokoto.cn/?encode=json", options);
    if (!response.ok) {
      throw new Error("一言接口请求失败");
    }
    const data = await response.json();
    const message = formatYiyanQuote(data);
    if (message) {
      yiyanMessage = message;
      updateGreetingDisplay();
    }
  } catch (error) {
    console.error("一言获取失败", error);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function normaliseWeatherSetting(raw) {
  if (Array.isArray(raw)) {
    return raw.map(item => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? { city: trimmed } : null;
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      if (typeof item.city === "string" && item.city.trim()) {
        return { city: item.city.trim() };
      }
      if (typeof item.label === "string" && item.label.trim()) {
        return { city: item.label.trim() };
      }
      if (typeof item.name === "string" && item.name.trim()) {
        return { city: item.name.trim() };
      }
      if (typeof item.id === "string" && item.id.trim()) {
        return { city: item.id.trim() };
      }
      return null;
    }).filter(item => item !== null);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? { city: trimmed } : null;
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (typeof raw.city === "string" && raw.city.trim()) {
    return { city: raw.city.trim() };
  }
  if (typeof raw.label === "string" && raw.label.trim()) {
    return { city: raw.label.trim() };
  }
  if (typeof raw.name === "string" && raw.name.trim()) {
    return { city: raw.name.trim() };
  }
  if (typeof raw.id === "string" && raw.id.trim()) {
    return { city: raw.id.trim() };
  }
  return null;
}

function getDefaultWeather() {
  const cityCandidate =
    typeof runtimeConfig.weather?.defaultCity === "string"
      ? runtimeConfig.weather.defaultCity.trim()
      : "";
  const city = cityCandidate || defaultWeather.city;
  runtimeConfig.weather.defaultCity = city;
  return { city };
}

function applyRuntimeConfig(config) {
  if (!config || typeof config !== "object") {
    return;
  }
  const city =
    typeof config.weather?.defaultCity === "string" ? config.weather.defaultCity.trim() : "";
  if (city) {
    runtimeConfig.weather.defaultCity = city;
    if (weatherSource !== "settings") {
      setActiveWeather({ city }, { source: "default" });
    }
  }
}

function weathersAreEqual(a, b) {
  if (!a || !b) {
    return false;
  }
  return (a.city || "") === (b.city || "");
}

function updateActiveWeather(weather) {
  if (!weather) {
    return;
  }
  if (weathersAreEqual(activeWeather, weather)) {
    return;
  }
  activeWeather = { city: weather.city };
  refreshWeatherDisplay();
}

function setActiveWeather(rawWeather, { source = "settings" } = {}) {
  let weather = normaliseWeatherSetting(rawWeather);
  if (!weather || (Array.isArray(weather) && weather.length === 0)) {
    if (source === "settings") {
      weatherSource = "default";
      updateActiveWeather(getDefaultWeather());
    }
    return;
  }
  if (source === "settings") {
    weatherSource = "settings";
    if (Array.isArray(weather)) {
      // Use the first city in the array
      weather = weather[0];
    }
    updateActiveWeather(weather);
    return;
  }
  if (weatherSource !== "settings") {
    weatherSource = "default";
    if (Array.isArray(weather)) {
      // Use the first city in the array
      weather = weather[0];
    }
    updateActiveWeather(weather);
  }
}

function refreshWeatherDisplay() {
  if (!weatherElement) return;
  const weather = activeWeather && activeWeather.city ? activeWeather : getDefaultWeather();
  updateWeather(weather);
}

function formatWeatherErrorMessage(rawMessage) {
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) {
    return "Weather information is unavailable.";
  }
  const mapQWeatherCode = (code) => {
    switch (code) {
      case "401":
      case "403":
        return "Invalid API Key or API Host.";
      case "402":
        return "API quota exhausted. Try again later.";
      case "429":
        return "Too many requests. Please wait and retry.";
      case "204":
        return "City not found. Check the name in admin.";
      default:
        return null;
    }
  };
  if (message.includes("Missing QWeather API Key")) {
    return "Weather API key is missing. Configure it in admin.";
  }
  if (message.includes("City name is required") || message.includes("Failed to resolve city location")) {
    return "City not found. Check the name in admin.";
  }
  const geocodeMatch = message.match(/QWeather geocode error: ([^\\.]+)/);
  if (geocodeMatch) {
    const hint = mapQWeatherCode(geocodeMatch[1]);
    if (geocodeMatch[1] === "invalid_response") {
      return "City lookup failed. API Host may be unreachable.";
    }
    return hint || `City lookup failed (code ${geocodeMatch[1]}). Check API Host/Key or city spelling.`;
  }
  const nowMatch = message.match(/QWeather now error: ([^\\.]+)/);
  if (nowMatch) {
    const hint = mapQWeatherCode(nowMatch[1]);
    if (nowMatch[1] === "invalid_response") {
      return "Weather service unavailable. API Host may be unreachable.";
    }
    return hint || `Weather service error (code ${nowMatch[1]}). Check API Host/Key or plan.`;
  }
  if (message.includes("Weather request timed out") || message.includes("Weather request failed")) {
    return "Weather service is temporarily unavailable.";
  }
  return message;
}

async function updateWeather(weather, retryCount = 0) {
  const requestToken = ++weatherRequestToken;
  const city = typeof weather?.city === "string" ? weather.city.trim() : "";
  const maxRetries = 2;
  const retryDelay = 1000;

  try {
    const response = await fetch("/api/weather");

    let payload;
    try {
      payload = await response.json();
    } catch (_error) {
      throw new Error("天气服务响应异常");
    }

      if (!response.ok || (payload && payload.success === false)) {
        const message =
          typeof payload?.message === "string" && payload.message.trim()
            ? payload.message.trim()
            : "天气数据请求失败";
        throw new Error(formatWeatherErrorMessage(message));
      }

    const data =
      payload && typeof payload === "object" && "data" in payload ? payload.data : payload;

    if (requestToken !== weatherRequestToken) {
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      // Multiple cities
      const weatherInfo = data.map(item => {
        const descriptionRaw = typeof item?.text === "string" ? item.text.trim() : "";
        const description = descriptionRaw || "天气良好";
        const temperatureValue = Number(item?.temperature);
        const temperatureText = Number.isFinite(temperatureValue)
          ? ` ${Math.round(temperatureValue)}°C`
          : "";
        const resolvedCity =
          typeof item?.city === "string" && item.city.trim()
            ? item.city.trim()
            : city || getDefaultWeather().city;

        const locationLabel = resolvedCity ? `${resolvedCity} · ` : "";
        return `${locationLabel}${description}${temperatureText}`.trim();
      });
      startWeatherRotation(weatherInfo);
    } else if (data && !Array.isArray(data)) {
      // Single city
      const descriptionRaw = typeof data?.text === "string" ? data.text.trim() : "";
      const description = descriptionRaw || "天气良好";
      const temperatureValue = Number(data?.temperature);
      const temperatureText = Number.isFinite(temperatureValue)
        ? ` ${Math.round(temperatureValue)}°C`
        : "";
      const resolvedCity =
        typeof data?.city === "string" && data.city.trim()
          ? data.city.trim()
          : city || getDefaultWeather().city;

      const locationLabel = resolvedCity ? `${resolvedCity} · ` : "";
      weatherElement.textContent = `${locationLabel}${description}${temperatureText}`.trim();
    } else {
      // This case handles empty array or other falsy data values
      throw new Error("未能获取有效天气数据");
    }
  } catch (error) {
    console.error("天气数据获取失败", error);
    if (weatherRotationInterval) {
      clearInterval(weatherRotationInterval);
      weatherRotationInterval = null;
    }
    weatherElement.textContent = "天气信息获取失败";
    if (requestToken !== weatherRequestToken) {
      return;
    }

    if (retryCount < maxRetries) {
      console.log(`将在 ${retryDelay}ms 后重试（尝试 ${retryCount + 1}/${maxRetries}）...`);
      setTimeout(() => {
        if (requestToken === weatherRequestToken) {
          updateWeather(weather, retryCount + 1);
        }
      }, retryDelay);
      return;
    }

    const fallbackCity = city || getDefaultWeather().city;
    const locationLabel = fallbackCity ? `${fallbackCity} · ` : "";
    const rawMessage = error && typeof error.message === "string" ? error.message.trim() : "";
      const message = formatWeatherErrorMessage(rawMessage);
      weatherElement.textContent = `${locationLabel}${message}`.trim();
    }
  }

let weatherRotationInterval = null;
function startWeatherRotation(weatherInfo) {
  if (weatherRotationInterval) {
    clearInterval(weatherRotationInterval);
  }

  if (!weatherInfo || weatherInfo.length === 0) {
    return;
  }

  let index = 0;
  weatherElement.textContent = weatherInfo[index]; // Set initial text immediately

  if (weatherInfo.length > 1) {
    index = 1;
    weatherRotationInterval = setInterval(() => {
      weatherElement.textContent = weatherInfo[index];
      index = (index + 1) % weatherInfo.length;
    }, 5000);
  }
}


function scrollToTop() {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    window.scrollTo(0, 0);
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleBackToTopVisibility() {
  if (!backToTopButton) return;
  if (window.scrollY > BACK_TO_TOP_THRESHOLD) {
    if (backToTopButton.hasAttribute("hidden")) {
      backToTopButton.removeAttribute("hidden");
    }
  } else if (!backToTopButton.hasAttribute("hidden")) {
    backToTopButton.setAttribute("hidden", "");
  }
}

async function initialise() {
  updateDocumentTitle(DEFAULT_SITE_SETTINGS.siteName);
  updateFavicon(DEFAULT_SITE_SETTINGS.siteLogo, DEFAULT_SITE_SETTINGS.siteName);
  updateFooter(DEFAULT_SITE_SETTINGS.footer);
  showCollection(activeCollection);
  if (searchEngineInput) {
    setSearchEngine(searchEngineInput.value || "google");
  }
  updateClock();
  setInterval(updateClock, 1_000);

  const dataPromise = loadData();

  loadYiyanQuote();

  if (backToTopButton) {
    backToTopButton.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToTop();
    });
    handleBackToTopVisibility();
    window.addEventListener("scroll", handleBackToTopVisibility, { passive: true });
  }
  if (collectionToggleButtons.length) {
    collectionToggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.view;
        if (!view) return;
        showCollection(view);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
          return;
        }
        event.preventDefault();
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const currentIndex = collectionToggleButtons.indexOf(button);
        const nextIndex =
          (currentIndex + offset + collectionToggleButtons.length) % collectionToggleButtons.length;
        const nextButton = collectionToggleButtons[nextIndex];
        if (!nextButton) return;
        const view = nextButton.dataset.view;
        if (!view) return;
        showCollection(view, { focusTab: true });
      });
    });
  }
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearchSubmit);
  }
  if (searchTargetSelect) {
    searchTargetSelect.addEventListener("change", updateSearchControls);
  }
  if (searchEngineButtons.length) {
    searchEngineButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled || searchEngineInput?.disabled) {
          return;
        }
        const value = button.dataset.engineOption;
        if (value) {
          setSearchEngine(value);
        }
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveSearchEngineSelection(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveSearchEngineSelection(-1);
        }
      });
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (currentSearchTarget !== "web") {
        performLocalSearch(currentSearchTarget, searchInput.value);
      }
    });
  }
  updateSearchControls();

  await dataPromise.catch(() => {});
  if (weatherRequestToken === 0) {
    refreshWeatherDisplay();
  }

}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
