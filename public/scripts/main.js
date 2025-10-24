const siteNameElement = document.getElementById("site-name");
const siteLogoElement = document.getElementById("site-logo");
const timeElement = document.getElementById("current-time");
const dateElement = document.getElementById("current-date");
const greetingElement = document.getElementById("greeting-text");
const weatherElement = document.getElementById("weather-info");
const appsGrid = document.getElementById("apps-grid");
const bookmarksGrid = document.getElementById("bookmarks-grid");
const appsEmpty = document.getElementById("apps-empty");
const bookmarksEmpty = document.getElementById("bookmarks-empty");
const searchForm = document.getElementById("global-search-form");
const searchInput = document.getElementById("global-search");
const searchTargetSelect = document.getElementById("search-target");
const searchEngineSelect = document.getElementById("search-engine");
const searchEngineWrapper = document.querySelector('.search-select[data-control="engine"]');
const searchFeedback = document.getElementById("local-search-feedback");

const defaultSiteName = siteNameElement && siteNameElement.textContent
  ? siteNameElement.textContent.trim() || "导航中心"
  : "导航中心";
const defaultDocumentTitle = document.title || defaultSiteName;
const DEFAULT_SITE_SETTINGS = {
  siteName: defaultSiteName,
  siteLogo: "",
  greeting: "",
};

let customGreeting = "";

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const defaultLocation = {
  latitude: 39.9042,
  longitude: 116.4074,
  label: "北京",
};

const appsEmptyDefault = appsEmpty ? appsEmpty.textContent : "";
const bookmarksEmptyDefault = bookmarksEmpty ? bookmarksEmpty.textContent : "";

const originalData = {
  apps: [],
  bookmarks: [],
};

let currentSearchTarget = "web";

const searchEngineBuilders = {
  google: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  baidu: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
  bing: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
};

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
  greetingElement.textContent = customGreeting || getGreeting(hour);
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
  const prepared = { ...DEFAULT_SITE_SETTINGS };
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
  return prepared;
}

function applySiteSettings(settings) {
  const prepared = prepareSiteSettings(settings);
  customGreeting = prepared.greeting;

  if (siteNameElement) {
    siteNameElement.textContent = prepared.siteName;
  }
  document.title = prepared.siteName || defaultDocumentTitle;
  renderSiteLogo(prepared.siteLogo);
  updateGreetingDisplay();
}

function renderSiteLogo(value) {
  if (!siteLogoElement) return;
  while (siteLogoElement.firstChild) {
    siteLogoElement.removeChild(siteLogoElement.firstChild);
  }
  siteLogoElement.textContent = "";
  siteLogoElement.classList.remove("has-image");
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean) {
    siteLogoElement.hidden = true;
    return;
  }

  siteLogoElement.hidden = false;
  if (isLogoUrl(clean)) {
    const img = document.createElement("img");
    img.src = clean;
    img.alt = "";
    img.decoding = "async";
    siteLogoElement.classList.add("has-image");
    siteLogoElement.appendChild(img);
  } else {
    siteLogoElement.textContent = clean.slice(0, 4);
  }
}

function isLogoUrl(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:");
}

function renderApps(items, options = {}) {
  renderTileGrid(appsGrid, appsEmpty, items, {
    emptyMessage: options.emptyMessage,
    defaultMessage: appsEmptyDefault,
  });
}

function renderTileGrid(container, emptyHint, items, { emptyMessage, defaultMessage } = {}) {
  if (!container || !emptyHint) return;

  container.innerHTML = "";

  if (!Array.isArray(items) || !items.length) {
    emptyHint.hidden = false;
    if (emptyMessage) {
      emptyHint.textContent = emptyMessage;
    } else if (typeof defaultMessage === "string") {
      emptyHint.textContent = defaultMessage;
    }
    return;
  }

  emptyHint.hidden = true;
  for (const item of items) {
    container.appendChild(createTile(item));
  }
}

function renderBookmarks(items, options = {}) {
  if (!bookmarksGrid || !bookmarksEmpty) return;

  bookmarksGrid.innerHTML = "";

  if (!Array.isArray(items) || !items.length) {
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

    group.items.forEach((item) => {
      list.appendChild(createTile(item));
    });

    groupElement.appendChild(list);
    bookmarksGrid.appendChild(groupElement);
  });
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

  const header = document.createElement("div");
  header.className = "tile-header";

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
  title.textContent = item.name || "未命名";

  header.appendChild(iconWrapper);
  header.appendChild(title);
  link.appendChild(header);

  if (item.description) {
    const description = document.createElement("p");
    description.className = "tile-description";
    description.textContent = item.description;
    link.appendChild(description);
  }

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
  const trimmed = query.trim();
  if (!trimmed) {
    clearLocalSearchResults();
    return;
  }

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
    const engineKey = searchEngineSelect ? searchEngineSelect.value : "google";
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
  if (searchEngineSelect) {
    searchEngineSelect.disabled = !isWebSearch;
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

  if (!searchInput) return;

  if (hasChanged) {
    performLocalSearch(nextTarget, searchInput.value);
  } else if (searchInput.value.trim()) {
    performLocalSearch(nextTarget, searchInput.value);
  }
}

function loadWeather() {
  if (!weatherElement) return;

  const timer = setTimeout(() => {
    updateWeather(defaultLocation.latitude, defaultLocation.longitude, defaultLocation.label);
  }, 4000);

  if (!navigator.geolocation) {
    clearTimeout(timer);
    updateWeather(defaultLocation.latitude, defaultLocation.longitude, defaultLocation.label);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      clearTimeout(timer);
      const { latitude, longitude } = position.coords;
      updateWeather(latitude, longitude, "当前位置");
    },
    () => {
      clearTimeout(timer);
      updateWeather(defaultLocation.latitude, defaultLocation.longitude, defaultLocation.label);
    },
    { maximumAge: 60_000, timeout: 5000 }
  );
}

async function updateWeather(latitude, longitude, label = "") {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current_weather: "true",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) {
      throw new Error("天气数据请求失败");
    }
    const data = await response.json();
    if (!data.current_weather) {
      throw new Error("缺少实时天气数据");
    }

    const { temperature, weathercode } = data.current_weather;
    const description = weatherCodeToText(weathercode);
    const locationLabel = label ? `${label} · ` : "";
    weatherElement.textContent = `${locationLabel}${description} ${Math.round(temperature)}°C`;
  } catch (error) {
    console.error("天气数据获取失败", error);
    weatherElement.textContent = "天气信息暂不可用";
  }
}

function weatherCodeToText(code) {
  const mapping = {
    0: "晴朗",
    1: "多云",
    2: "局部多云",
    3: "阴",
    45: "有雾",
    48: "霜雾",
    51: "毛毛雨",
    53: "小雨",
    55: "中雨",
    56: "冻毛毛雨",
    57: "冻雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "冻雨",
    67: "冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "强阵雨",
    82: "暴阵雨",
    85: "阵雪",
    86: "强阵雪",
    95: "雷雨",
    96: "雷雨伴冰雹",
    99: "强雷雨伴冰雹",
  };
  return mapping[code] || "天气良好";
}

function initialise() {
  updateClock();
  setInterval(updateClock, 60_000);
  loadData();
  loadWeather();
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearchSubmit);
  }
  if (searchTargetSelect) {
    searchTargetSelect.addEventListener("change", updateSearchControls);
  }
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (currentSearchTarget !== "web") {
        performLocalSearch(currentSearchTarget, searchInput.value);
      }
    });
  }
  updateSearchControls();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
