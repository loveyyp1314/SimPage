const timeElement = document.getElementById("current-time");
const dateElement = document.getElementById("current-date");
const greetingElement = document.getElementById("greeting-text");
const weatherElement = document.getElementById("weather-info");
const appsGrid = document.getElementById("apps-grid");
const bookmarksGrid = document.getElementById("bookmarks-grid");
const appsEmpty = document.getElementById("apps-empty");
const bookmarksEmpty = document.getElementById("bookmarks-empty");

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

function updateClock() {
  const now = new Date();
  if (timeElement) {
    timeElement.textContent = timeFormatter.format(now);
  }
  if (dateElement) {
    dateElement.textContent = dateFormatter.format(now);
  }
  if (greetingElement) {
    greetingElement.textContent = getGreeting(now.getHours());
  }
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

async function loadData() {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) {
      throw new Error("数据拉取失败");
    }
    const payload = await response.json();
    const apps = Array.isArray(payload.apps) ? payload.apps : [];
    const bookmarks = Array.isArray(payload.bookmarks) ? payload.bookmarks : [];
    renderCollection(appsGrid, appsEmpty, apps);
    renderCollection(bookmarksGrid, bookmarksEmpty, bookmarks);
  } catch (error) {
    console.error("加载数据失败", error);
    if (appsEmpty) {
      appsEmpty.hidden = false;
      appsEmpty.textContent = "加载应用数据失败，请稍后重试。";
    }
    if (bookmarksEmpty) {
      bookmarksEmpty.hidden = false;
      bookmarksEmpty.textContent = "加载书签数据失败，请稍后重试。";
    }
  }
}

function renderCollection(container, emptyHint, items) {
  if (!container || !emptyHint) return;
  container.innerHTML = "";

  if (!items.length) {
    emptyHint.hidden = false;
    return;
  }

  emptyHint.hidden = true;

  for (const item of items) {
    container.appendChild(createTile(item));
  }
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

  const meta = document.createElement("div");
  meta.className = "tile-meta";
  meta.textContent = extractDomain(item.url);
  link.appendChild(meta);

  return link;
}

function deriveFallbackIcon(name) {
  if (!name) return "★";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "★";
}

function extractDomain(url) {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.replace(/^www\./, "");
  } catch (error) {
    return url || "";
  }
}

function normalizeUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
