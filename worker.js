import { scrypt } from "@noble/hashes/scrypt.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 小时
const AUTH_HEADER_PREFIX = "Bearer ";
const WEATHER_API_TIMEOUT_MS = 5_000;
const DEFAULT_WEATHER_CITY = "北京";
const DEFAULT_ADMIN_PASSWORD = "admin123";

const DEFAULT_SETTINGS = Object.freeze({
  siteName: "SimPage",
  siteLogo: "",
  greeting: "",
  footer: "",
  weather: { city: DEFAULT_WEATHER_CITY },
});

const DEFAULT_STATS = Object.freeze({
  visitorCount: 0,
});

const DEFAULT_APPS = Object.freeze([
  Object.freeze({
    id: "app-figma",
    name: "Figma",
    url: "https://www.figma.com/",
    description: "协作式界面设计工具。",
    icon: "🎨",
  }),
  Object.freeze({
    id: "app-notion",
    name: "Notion",
    url: "https://www.notion.so/",
    description: "多合一的笔记与知识管理平台。",
    icon: "🗂️",
  }),
  Object.freeze({
    id: "app-slack",
    name: "Slack",
    url: "https://slack.com/",
    description: "团队即时沟通与协作中心。",
    icon: "💬",
  }),
  Object.freeze({
    id: "app-github",
    name: "GitHub",
    url: "https://github.com/",
    description: "代码托管与协作平台。",
    icon: "🐙",
  }),
  Object.freeze({
    id: "app-canva",
    name: "Canva",
    url: "https://www.canva.com/",
    description: "简单易用的在线设计工具。",
    icon: "🖌️",
  }),
]);

const DEFAULT_BOOKMARKS = Object.freeze([
  Object.freeze({
    id: "bookmark-oschina",
    name: "开源中国",
    url: "https://www.oschina.net/",
    description: "聚焦开源信息与技术社区。",
    icon: "🌐",
    category: "技术社区",
  }),
  Object.freeze({
    id: "bookmark-sspai",
    name: "少数派",
    url: "https://sspai.com/",
    description: "关注效率工具与生活方式的媒体。",
    icon: "📰",
    category: "效率与生活",
  }),
  Object.freeze({
    id: "bookmark-zhihu",
    name: "知乎",
    url: "https://www.zhihu.com/",
    description: "问答与知识分享社区。",
    icon: "❓",
    category: "知识学习",
  }),
  Object.freeze({
    id: "bookmark-jike",
    name: "即刻",
    url: "https://m.okjike.com/",
    description: "兴趣社交与资讯聚合平台。",
    icon: "📮",
    category: "资讯聚合",
  }),
  Object.freeze({
    id: "bookmark-juejin",
    name: "稀土掘金",
    url: "https://juejin.cn/",
    description: "开发者技术社区与优质内容。",
    icon: "💡",
    category: "技术社区",
  }),
]);

const WEATHER_FETCH_HEADERS = Object.freeze({
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; SimPage/1.0; +https://github.com/)",
});

export default {
  async fetch(request, env, _ctx) {
    const corsHeaders = buildCorsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = normalisePath(url.pathname);

    try {
      if (pathname === "/api/login" && request.method === "POST") {
        return await handleLogin(request, env, corsHeaders);
      }

      if (pathname === "/api/data") {
        if (request.method === "GET") {
          return await handlePublicData(env, corsHeaders);
        }
        if (request.method === "PUT") {
          const authorised = await verifyAuth(request, env);
          if (!authorised) {
            return unauthorizedResponse(corsHeaders);
          }
          return await handleUpdateData(request, env, corsHeaders);
        }
      }

      if (pathname === "/api/config" && request.method === "GET") {
        return handleConfig(env, corsHeaders);
      }

      if (pathname === "/api/weather" && request.method === "GET") {
        return await handleWeather(env, corsHeaders);
      }

      if (pathname === "/api/admin/data") {
        const authorised = await verifyAuth(request, env);
        if (!authorised) {
          return unauthorizedResponse(corsHeaders);
        }
        if (request.method === "GET") {
          return await handleAdminData(env, corsHeaders);
        }
        if (request.method === "PUT") {
          return await handleUpdateData(request, env, corsHeaders);
        }
      }

      if (pathname === "/api/admin/password" && request.method === "POST") {
        const authorised = await verifyAuth(request, env);
        if (!authorised) {
          return unauthorizedResponse(corsHeaders);
        }
        return await handlePasswordUpdate(request, env, corsHeaders);
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        return notFoundResponse(corsHeaders);
      }

      return await handleStaticAsset(request, env, corsHeaders);
    } catch (error) {
      console.error("SimPage Worker error:", error);
      return jsonResponse({ success: false, message: "服务器内部错误" }, 500, corsHeaders);
    }
  },
};

function buildCorsHeaders(env) {
  const originRaw = typeof env?.ALLOWED_ORIGIN === "string" ? env.ALLOWED_ORIGIN.trim() : "";
  const allowOrigin = originRaw || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
  };
}

function jsonResponse(payload, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function unauthorizedResponse(corsHeaders) {
  return jsonResponse({ success: false, message: "未授权" }, 401, corsHeaders);
}

function notFoundResponse(corsHeaders) {
  return jsonResponse({ success: false, message: "未找到资源" }, 404, corsHeaders);
}

function normalisePath(pathname) {
  if (typeof pathname !== "string" || !pathname) {
    return "/";
  }
  const trimmed = pathname.replace(/\/+$|\s+$/g, "");
  return trimmed || "/";
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
}

async function handleLogin(request, env, corsHeaders) {
  const body = await parseJsonBody(request);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    return jsonResponse({ success: false, message: "请输入密码。" }, 400, corsHeaders);
  }

  const fullData = await readFullData(env);
  const admin = fullData.admin;
  if (!admin || !admin.passwordHash || !admin.passwordSalt) {
    return jsonResponse({ success: false, message: "登录功能暂不可用，请稍后再试。" }, 500, corsHeaders);
  }

  const computedHash = hashPassword(password, admin.passwordSalt);
  if (!safeCompare(admin.passwordHash, computedHash)) {
    return jsonResponse({ success: false, message: "密码错误。" }, 401, corsHeaders);
  }

  const token = crypto.randomUUID();
  await env.NAVIGATION_SESSIONS.put(sessionKey(token), "1", {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  return jsonResponse({ success: true, token }, 200, corsHeaders);
}

async function handlePublicData(env, corsHeaders) {
  const fullData = await readFullData(env);
  const currentCount = normaliseVisitorCount(fullData.stats?.visitorCount);
  fullData.stats = { visitorCount: currentCount + 1 };
  await writeFullData(env, fullData);
  return jsonResponse(sanitiseData(fullData), 200, corsHeaders);
}

function handleConfig(env, corsHeaders) {
  const envCity = typeof env?.DEFAULT_WEATHER_CITY === "string" ? env.DEFAULT_WEATHER_CITY.trim() : "";
  const defaultCity = envCity || DEFAULT_WEATHER_CITY;
  return jsonResponse({ weather: { defaultCity } }, 200, corsHeaders);
}

async function handleWeather(env, corsHeaders) {
  try {
    const fullData = await readFullData(env);
    const city = resolveWeatherCity(fullData, env);
    if (!city) {
      return jsonResponse({ success: false, message: "尚未配置天气城市，请联系管理员。" }, 503, corsHeaders);
    }
    const weather = await fetchOpenMeteoWeather(city);
    return jsonResponse({ success: true, data: { ...weather, city } }, 200, corsHeaders);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return jsonResponse({ success: false, message: "天气获取失败，请稍后重试。" }, 502, corsHeaders);
  }
}

async function handleAdminData(env, corsHeaders) {
  const fullData = await readFullData(env);
  const data = sanitiseData(fullData);
  data.settings.weather = { city: resolveWeatherCity(fullData, env) };
  return jsonResponse({ success: true, data }, 200, corsHeaders);
}

async function handleUpdateData(request, env, corsHeaders) {
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return jsonResponse({ success: false, message: "请求体无效" }, 400, corsHeaders);
  }

  try {
    const settings = normaliseSettingsInput(body.settings);
    const appsInfo = normaliseCollection(body.apps, "apps");
    const bookmarksInfo = normaliseCollection(body.bookmarks, "bookmarks");

    const fullData = await readFullData(env);
    fullData.settings = settings;
    fullData.apps = appsInfo.items;
    fullData.bookmarks = bookmarksInfo.items;

    await writeFullData(env, fullData);

    return jsonResponse({ success: true, data: sanitiseData(fullData) }, 200, corsHeaders);
  } catch (error) {
    const message = error && typeof error.message === "string" ? error.message : "数据更新失败";
    return jsonResponse({ success: false, message }, 400, corsHeaders);
  }
}

async function handlePasswordUpdate(request, env, corsHeaders) {
  const body = await parseJsonBody(request);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPasswordRaw = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return jsonResponse({ success: false, message: "请输入当前密码。" }, 400, corsHeaders);
  }

  const newPassword = newPasswordRaw.trim();
  if (!newPassword) {
    return jsonResponse({ success: false, message: "新密码不能为空。" }, 400, corsHeaders);
  }

  const fullData = await readFullData(env);
  const admin = fullData.admin;
  if (!safeCompare(admin.passwordHash, hashPassword(currentPassword, admin.passwordSalt))) {
    return jsonResponse({ success: false, message: "当前密码错误。" }, 401, corsHeaders);
  }

  const passwordSalt = generateSaltHex();
  const passwordHash = hashPassword(newPassword, passwordSalt);

  fullData.admin = { passwordHash, passwordSalt };
  await writeFullData(env, fullData);

  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function verifyAuth(request, env) {
  const raw = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!raw || typeof raw !== "string" || !raw.startsWith(AUTH_HEADER_PREFIX)) {
    return false;
  }
  const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    return false;
  }
  const session = await env.NAVIGATION_SESSIONS.get(sessionKey(token));
  return Boolean(session);
}

function sessionKey(token) {
  return `session:${token}`;
}

async function readFullData(env) {
  const stored = await env.NAVIGATION_DATA.get("navigation", "json");
  if (!stored) {
    const defaults = await buildDefaultData();
    await writeFullData(env, defaults);
    return defaults;
  }
  const { fullData, mutated } = await normaliseStoredData(stored);
  if (mutated) {
    await writeFullData(env, fullData);
  }
  return fullData;
}

async function writeFullData(env, fullData) {
  await env.NAVIGATION_DATA.put("navigation", JSON.stringify(fullData));
}

async function buildDefaultData() {
  const admin = await createDefaultAdminCredentials();
  return {
    settings: createDefaultSettings(),
    apps: createDefaultApps(),
    bookmarks: createDefaultBookmarks(),
    stats: { ...DEFAULT_STATS },
    admin,
  };
}

function createDefaultSettings() {
  return {
    siteName: DEFAULT_SETTINGS.siteName,
    siteLogo: DEFAULT_SETTINGS.siteLogo,
    greeting: DEFAULT_SETTINGS.greeting,
    footer: DEFAULT_SETTINGS.footer,
    weather: { city: DEFAULT_SETTINGS.weather.city },
  };
}

function createDefaultApps() {
  return DEFAULT_APPS.map((app) => ({ ...app }));
}

function createDefaultBookmarks() {
  return DEFAULT_BOOKMARKS.map((bookmark) => ({ ...bookmark }));
}

async function createDefaultAdminCredentials() {
  const passwordSalt = generateSaltHex();
  const passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD, passwordSalt);
  return { passwordHash, passwordSalt };
}

async function normaliseStoredData(raw) {
  const settings = normaliseSettingsInput(raw?.settings);
  const appsInfo = normaliseCollection(raw?.apps, "apps");
  const bookmarksInfo = normaliseCollection(raw?.bookmarks, "bookmarks");
  const stats = normaliseStats(raw?.stats);
  const adminInfo = await normaliseAdmin(raw?.admin);

  const fullData = {
    settings,
    apps: appsInfo.items,
    bookmarks: bookmarksInfo.items,
    stats,
    admin: adminInfo.value,
  };

  const mutated = appsInfo.mutated || bookmarksInfo.mutated || adminInfo.mutated;
  return { fullData, mutated };
}

function normaliseSettingsInput(raw) {
  const result = createDefaultSettings();
  if (!raw || typeof raw !== "object") {
    return result;
  }

  if (typeof raw.siteName === "string" && raw.siteName.trim()) {
    result.siteName = raw.siteName.trim();
  }
  if (typeof raw.siteLogo === "string") {
    result.siteLogo = raw.siteLogo.trim();
  }
  if (typeof raw.greeting === "string") {
    result.greeting = raw.greeting.trim();
  }
  if (typeof raw.footer === "string") {
    result.footer = normaliseFooter(raw.footer);
  }

  let weatherSource = null;
  if (raw.weather && typeof raw.weather === "object") {
    weatherSource = raw.weather;
  } else if (raw.weatherLocation && typeof raw.weatherLocation === "object") {
    weatherSource = raw.weatherLocation;
  }

  const weather = normaliseWeather(weatherSource);
  if (weather) {
    result.weather = weather;
  }

  return result;
}

function normaliseCollection(rawCollection, type) {
  const items = Array.isArray(rawCollection) ? rawCollection : [];
  let mutated = !Array.isArray(rawCollection);
  const seen = new Set();
  const result = [];

  for (const rawItem of items) {
    const item = normaliseCollectionItem(rawItem, type);
    if (!item.id || seen.has(item.id)) {
      item.id = createItemId(type);
      mutated = true;
    }
    seen.add(item.id);
    result.push(item);
  }

  return { items: result, mutated };
}

function normaliseCollectionItem(rawItem, type) {
  const item = rawItem && typeof rawItem === "object" ? rawItem : {};
  const base = {
    id: typeof item.id === "string" ? item.id.trim() : "",
    name: typeof item.name === "string" ? item.name.trim() : "",
    url: normaliseUrl(item.url),
    description: typeof item.description === "string" ? item.description.trim() : "",
    icon: typeof item.icon === "string" ? item.icon.trim() : "",
  };

  if (type === "bookmarks") {
    base.category = typeof item.category === "string" ? item.category.trim() : "";
  }

  if (!base.name) {
    base.name = "未命名";
  }

  return base;
}

function normaliseUrl(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (/^(https?|mailto|tel):/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed}`;
}

function normaliseStats(rawStats) {
  if (!rawStats || typeof rawStats !== "object") {
    return { ...DEFAULT_STATS };
  }
  return {
    visitorCount: normaliseVisitorCount(rawStats.visitorCount),
  };
}

async function normaliseAdmin(rawAdmin) {
  if (
    rawAdmin &&
    typeof rawAdmin === "object" &&
    typeof rawAdmin.passwordHash === "string" &&
    rawAdmin.passwordHash &&
    typeof rawAdmin.passwordSalt === "string" &&
    rawAdmin.passwordSalt
  ) {
    return { value: { passwordHash: rawAdmin.passwordHash, passwordSalt: rawAdmin.passwordSalt }, mutated: false };
  }
  const credentials = await createDefaultAdminCredentials();
  return { value: credentials, mutated: true };
}

function normaliseVisitorCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return DEFAULT_STATS.visitorCount;
  }
  return Math.floor(numeric);
}

function normaliseFooter(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}

function normaliseWeather(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const fields = ["city", "label", "name", "id"];
  for (const field of fields) {
    if (typeof raw[field] === "string") {
      const trimmed = raw[field].trim();
      if (trimmed) {
        return { city: trimmed };
      }
    }
  }
  return null;
}

function sanitiseData(fullData) {
  return {
    settings: normaliseSettingsInput(fullData?.settings),
    apps: cloneCollection(fullData?.apps),
    bookmarks: cloneCollection(fullData?.bookmarks),
    visitorCount: normaliseVisitorCount(fullData?.stats?.visitorCount),
  };
}

function cloneCollection(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => ({ ...item }));
}

function resolveWeatherCity(fullData, env) {
  const configured = normaliseWeather(fullData?.settings?.weather);
  if (configured?.city) {
    return configured.city;
  }
  const envCity = typeof env?.DEFAULT_WEATHER_CITY === "string" ? env.DEFAULT_WEATHER_CITY.trim() : "";
  if (envCity) {
    return envCity;
  }
  return DEFAULT_WEATHER_CITY;
}

function hashPassword(password, saltHex) {
  const passwordBytes = utf8ToBytes(password);
  const saltBytes = hexToBytes(saltHex);
  const derived = scrypt(passwordBytes, saltBytes, { N: 16384, r: 8, p: 1, dkLen: 64 });
  return bytesToHex(derived);
}

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function generateSaltHex() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function createItemId(type) {
  const prefix = type === "bookmarks" ? "bookmark" : "app";
  return `${prefix}-${crypto.randomUUID()}`;
}

async function fetchOpenMeteoWeather(city) {
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", city);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "zh");
  geocodeUrl.searchParams.set("format", "json");

  const geocodeResponse = await fetch(geocodeUrl.toString(), {
    signal: AbortSignal.timeout(WEATHER_API_TIMEOUT_MS),
    headers: WEATHER_FETCH_HEADERS,
  });

  if (!geocodeResponse.ok) {
    throw new Error("地理位置查询失败");
  }

  const geocodePayload = await geocodeResponse.json();
  if (!geocodePayload?.results?.length) {
    throw new Error("未找到该城市");
  }

  const location = geocodePayload.results[0];
  const { latitude, longitude } = location;

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(latitude));
  weatherUrl.searchParams.set("longitude", String(longitude));
  weatherUrl.searchParams.set("current_weather", "true");
  weatherUrl.searchParams.set("timezone", "auto");

  const weatherResponse = await fetch(weatherUrl.toString(), {
    signal: AbortSignal.timeout(WEATHER_API_TIMEOUT_MS),
    headers: WEATHER_FETCH_HEADERS,
  });

  if (!weatherResponse.ok) {
    throw new Error("天气数据获取失败");
  }

  const weatherPayload = await weatherResponse.json();
  const current = weatherPayload?.current_weather;
  if (!current) {
    throw new Error("天气数据格式异常");
  }

  const temperatureValue = Number(current.temperature);
  const windspeedValue = Number(current.windspeed);
  const codeValue = Number(current.weathercode);

  return {
    text: getWeatherDescription(codeValue),
    temperature: Number.isFinite(temperatureValue) ? temperatureValue : null,
    windspeed: Number.isFinite(windspeedValue) ? windspeedValue : null,
    weathercode: Number.isFinite(codeValue) ? codeValue : null,
    time: typeof current.time === "string" ? current.time : null,
  };
}

function getWeatherDescription(code) {
  const mapping = {
    0: "晴天",
    1: "晴朗",
    2: "多云",
    3: "阴天",
    45: "雾",
    48: "冻雾",
    51: "小雨",
    53: "中雨",
    55: "大雨",
    56: "小冻雨",
    57: "冻雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "小冻雨",
    67: "冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "中阵雨",
    82: "大阵雨",
    85: "小阵雪",
    86: "大阵雪",
    95: "雷雨",
    96: "雷雨伴冰雹",
    99: "雷雨伴大冰雹",
  };
  return mapping[code] || "天气良好";
}

async function handleStaticAsset(request, env, corsHeaders) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return notFoundResponse(corsHeaders);
  }

  const response = await env.ASSETS.fetch(request);
  return applyCorsHeaders(response, corsHeaders);
}

function applyCorsHeaders(response, corsHeaders) {
  if (!response || !corsHeaders || Object.keys(corsHeaders).length === 0) {
    return response;
  }
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
