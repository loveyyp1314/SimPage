const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const http = require("node:http");
const https = require("node:https");
const zlib = require("node:zlib");
const { randomUUID, scryptSync, timingSafeEqual, randomBytes } = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "navigation.json");

const visitorCountCache = {
  increment: 0,
  isWriting: false,
  lastWriteTime: 0,
  writeDelayMs: 30 * 1000, // 30 seconds
  writeThreshold: 50, // or every 50 visits
};

const BASE_DEFAULT_SETTINGS = Object.freeze({
  siteName: "SimPage",
  siteLogo: "",
  greeting: "",
  footer: "",
});

const DEFAULT_STATS = {
  visitorCount: 0,
};

const DEFAULT_WEATHER_CONFIG = Object.freeze({
  city: "北京",
});

const DEFAULT_ADMIN_PASSWORD = "admin123";
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12 小时
const CLEANUP_INTERVAL = 60 * 60 * 1000;
const AUTH_HEADER_PREFIX = "Bearer ";

const activeSessions = new Map();

const dataCache = {
  fullData: null,
  fileMeta: null,
  loadPromise: null,
  lastInfo: { mutated: false, passwordReset: false },
};

const runtimeDefaultWeatherConfig = Object.freeze(resolveDefaultWeatherConfig());

const runtimeConfig = {
  weather: {
    defaultCity: runtimeDefaultWeatherConfig.city,
  },
};

const WEATHER_API_TIMEOUT_MS = 5000;
const WEATHER_FETCH_HEADERS = Object.freeze({
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
});
const WEATHER_HTTP_HEADERS = Object.freeze({
  Accept: "application/json",
  "Accept-Encoding": "identity",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
});
const GEOLOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEOLOCATION_MAX_RETRIES = 3;
const GEOLOCATION_RETRY_DELAY_BASE_MS = 300;

const QWEATHER_API_HOST_DEFAULT = "https://api.qweather.com";

const geocodeCache = new Map();
const QWEATHER_CITY_ALIASES = Object.freeze({
  "北京": "Beijing",
  "上海": "Shanghai",
  "广州": "Guangzhou",
  "深圳": "Shenzhen",
  "杭州": "Hangzhou",
  "南京": "Nanjing",
  "天津": "Tianjin",
  "武汉": "Wuhan",
  "成都": "Chengdu",
  "重庆": "Chongqing",
  "西安": "Xian",
  "苏州": "Suzhou",
  "青岛": "Qingdao",
  "厦门": "Xiamen",
  "大连": "Dalian",
  "宁波": "Ningbo",
  "沈阳": "Shenyang",
  "哈尔滨": "Harbin",
  "长春": "Changchun",
  "长沙": "Changsha",
  "郑州": "Zhengzhou",
  "济南": "Jinan",
  "福州": "Fuzhou",
  "合肥": "Hefei",
  "昆明": "Kunming",
  "南宁": "Nanning",
  "贵阳": "Guiyang",
  "兰州": "Lanzhou",
  "太原": "Taiyuan",
  "石家庄": "Shijiazhuang",
  "乌鲁木齐": "Urumqi",
  "拉萨": "Lhasa",
  "香港": "Hong Kong",
  "澳门": "Macau",
  "台北": "Taipei",
});

const QWEATHER_CITY_ALIAS_CODES = Object.freeze({
  "5317-4eac": "Beijing",
  "4e0a-6d77": "Shanghai",
  "5e7f-5dde": "Guangzhou",
  "6df1-5733": "Shenzhen",
  "676d-5dde": "Hangzhou",
  "5357-4eac": "Nanjing",
  "5929-6d25": "Tianjin",
  "6b66-6c49": "Wuhan",
  "6210-90fd": "Chengdu",
  "91cd-5e86": "Chongqing",
  "897f-5b89": "Xian",
  "82cf-5dde": "Suzhou",
  "9752-5c9b": "Qingdao",
  "53a6-95e8": "Xiamen",
  "5927-8fde": "Dalian",
  "5b81-6ce2": "Ningbo",
  "6c88-9633": "Shenyang",
  "54c8-5c14-6ee8": "Harbin",
  "957f-6625": "Changchun",
  "957f-6c99": "Changsha",
  "90d1-5dde": "Zhengzhou",
  "6d4e-5357": "Jinan",
  "798f-5dde": "Fuzhou",
  "5408-80a5": "Hefei",
  "6606-660e": "Kunming",
  "5357-5b81": "Nanning",
  "8d35-9633": "Guiyang",
  "5170-5dde": "Lanzhou",
  "592a-539f": "Taiyuan",
  "77f3-5bb6-5e84": "Shijiazhuang",
  "4e4c-9c81-6728-9f50": "Urumqi",
  "62c9-8428": "Lhasa",
  "9999-6e2f": "Hong Kong",
  "6fb3-95e8": "Macau",
  "53f0-5317": "Taipei",
});

function normaliseQWeatherCityName(city) {
  if (!city) {
    return "";
  }
  const cleaned = city.replace(/\s+/g, "").replace(/(市|省|自治区|特别行政区)$/, "");
  const codeKey = Array.from(cleaned)
    .map((char) => char.codePointAt(0).toString(16))
    .join("-");
  if (QWEATHER_CITY_ALIAS_CODES[codeKey]) {
    return QWEATHER_CITY_ALIAS_CODES[codeKey];
  }
  if (QWEATHER_CITY_ALIASES[cleaned]) {
    return QWEATHER_CITY_ALIASES[cleaned];
  }
  const containsNonAscii = /[^\x00-\x7F]/.test(cleaned);
  return containsNonAscii ? "" : cleaned;
}
const weatherCache = new Map();
const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function readDataFileMeta() {
  try {
    const stats = await fs.stat(DATA_FILE);
    return {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      inode: typeof stats.ino === "number" ? stats.ino : null,
    };
  } catch (_error) {
    return null;
  }
}

function clearDataCache() {
  dataCache.fullData = null;
  dataCache.fileMeta = null;
  dataCache.lastInfo = { mutated: false, passwordReset: false };
}

function setDataCache(fullData, meta, info = { mutated: false, passwordReset: false }) {
  if (!meta) {
    clearDataCache();
    return;
  }
  dataCache.fullData = fullData;
  dataCache.fileMeta = {
    mtimeMs: meta.mtimeMs,
    size: meta.size,
    inode: typeof meta.inode === "number" ? meta.inode : null,
  };
  dataCache.lastInfo = info;
}

async function getCachedFullDataIfFresh() {
  if (!dataCache.fullData || !dataCache.fileMeta) {
    return null;
  }
  const meta = await readDataFileMeta();
  if (!meta) {
    clearDataCache();
    return null;
  }
  const cachedMeta = dataCache.fileMeta;
  const sameTimestamp = meta.mtimeMs === cachedMeta.mtimeMs;
  const sameSize = meta.size === cachedMeta.size;
  const sameInode =
    cachedMeta.inode == null || meta.inode == null || meta.inode === cachedMeta.inode;

  if (sameTimestamp && sameSize && sameInode) {
    return dataCache.fullData;
  }
  clearDataCache();
  return null;
}

const app = express();

app.use(express.json({ limit: "1mb" }));

app.post("/api/login", async (req, res, next) => {
  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) {
      res.status(400).json({ success: false, message: "请输入密码。" });
      return;
    }

    const fullData = await readFullData();
    let admin = fullData.admin;
    if (!admin || !admin.passwordSalt || !admin.passwordHash) {
      const credentials = createDefaultAdminCredentials();
      const updatedData = {
        settings: fullData.settings,
        apps: fullData.apps,
        bookmarks: fullData.bookmarks,
        stats: fullData.stats,
        admin: credentials,
      };
      await writeFullData(updatedData, { mutated: true, passwordReset: true });
      admin = credentials;
    }

    const hashed = hashPassword(password, admin.passwordSalt);
    const storedBuffer = Buffer.from(admin.passwordHash, "hex");
    const hashedBuffer = Buffer.from(hashed, "hex");

    const isMatch =
      storedBuffer.length === hashedBuffer.length && timingSafeEqual(storedBuffer, hashedBuffer);

    if (!isMatch) {
      res.status(401).json({ success: false, message: "密码错误。" });
      return;
    }

    const token = createAuthToken();
    activeSessions.set(token, { createdAt: Date.now() });
    res.json({ success: true, token });
  } catch (error) {
    next(error);
  }
});

app.get("/api/data", async (_req, res, next) => {
  try {
    const data = await handleVisitorAndReadData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/api/weather", async (_req, res, next) => {
  try {
    const config = await resolveWeatherRequestConfig();
    const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
    const locations = Array.isArray(config.locations) ? config.locations : [];
    if (locations.length > 0) {
      const weatherPromises = locations.map((location) =>
        fetchQWeatherNowByLocation(location, apiKey, config.apiHost)
          .then((weather) => ({
            ...weather,
            city: location.name || location.city || "",
            success: true,
          }))
          .catch((error) => {
            const label = location.name || location.city || "Unknown";
            console.error(`Weather fetch failed for ${label}:`, error);
            return { city: label, success: false, message: error.message };
          })
      );

      const results = await Promise.all(weatherPromises);
      const successfulWeatherData = results.filter((result) => result.success);

      res.json({ success: true, data: successfulWeatherData });
      return;
    }
    if (!config.city) {
      res.status(503).json({ success: false, message: "尚未配置天气城市，请联系管理员。" });
      return;
    }

    let cities = config.city;
    if (!Array.isArray(cities)) {
      cities = [cities];
    }
    const queryList = alignWeatherQueries(cities, config.query);
    const weatherPromises = cities.map((city, index) =>
      fetchQWeatherNowByCity(city, apiKey, queryList[index], config.apiHost)
        .then(weather => ({ ...weather, city, success: true }))
        .catch(error => {
          console.error(`???? ${city} ????????`, error);
          return { city, success: false, message: error.message };
        })
    );

    const results = await Promise.all(weatherPromises);
    const successfulWeatherData = results.filter(r => r.success);

    res.json({ success: true, data: successfulWeatherData });
  } catch (error) {
    if (error && error.expose) {
      const statusCode =
        typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600
          ? error.statusCode
          : 502;
      res.status(statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

app.get("/api/admin/data", requireAuth, async (_req, res, next) => {
  try {
    const data = await readAdminData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.get("/api/fetch-logo", requireAuth, (req, res) => {
  try {
    const targetUrl = req.query.targetUrl;
    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
      return res.status(400).json({ success: false, message: "缺少有效的 targetUrl 参数" });
    }

    // 移除协议 (http, https)
    let domain = targetUrl.trim().replace(/^(https?:\/\/)?/, "");
    // 移除第一个斜杠后的所有内容 (路径, 查询参数, 哈希)
    domain = domain.split("/")[0];

    if (!domain) {
      return res.status(400).json({ success: false, message: "无法从链接中提取域名。" });
    }

    const logoUrl = `https://icon.ooo/${domain}`;
    res.json({ success: true, logoUrl: logoUrl });

  } catch (error) {
    console.error("生成 Logo 链接时发生内部错误:", error);
    res.status(500).json({ success: false, message: "生成 Logo 链接失败" });
  }
});

app.put("/api/admin/data", requireAuth, handleDataUpdate);
app.put("/api/data", requireAuth, handleDataUpdate);
app.post("/api/admin/password", requireAuth, handlePasswordUpdate);
app.post("/api/admin/weather-test", requireAuth, handleWeatherTest);

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
  })
);

app.use((req, res) => {
  if (req.method === "GET") {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }
  res.status(404).json({ success: false, message: "未找到资源" });
});

app.use((error, _req, res, _next) => {
  console.error("服务器内部错误:", error);
  res.status(500).json({ success: false, message: "服务器内部错误" });
});

ensureDataFile()
  .then(() => {
    setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL).unref?.();
    app.listen(PORT, () => {
      console.log(`导航服务已启动，端口 ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("服务初始化失败", error);
    process.exit(1);
  });

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  let created = false;
  try {
    await fs.access(DATA_FILE);
  } catch (_error) {
    const initialData = createDefaultData();
    await writeFullData(initialData, { mutated: true, passwordReset: true });
    created = true;
  }

  if (created) {
    announceDefaultPassword("已创建默认数据文件，后台初始密码：admin123");
  } else {
    const { passwordReset } = await normaliseExistingFile();
    if (passwordReset) {
      announceDefaultPassword("检测到缺失的后台密码，已重置为默认密码：admin123");
    }
  }
}

async function normaliseExistingFile() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      const defaultData = createDefaultData();
      await writeFullData(defaultData, { mutated: true, passwordReset: true });
      return { passwordReset: true };
    }

    const { fullData, mutated, passwordReset } = normaliseFullData(parsed);
    const cacheInfo = { mutated, passwordReset };

    if (mutated) {
      await writeFullData(fullData, cacheInfo);
    } else {
      const meta = await readDataFileMeta();
      if (meta) {
        setDataCache(fullData, meta, cacheInfo);
      } else {
        clearDataCache();
      }
    }
    return { passwordReset };
  } catch (error) {
    console.error("读取数据文件失败，将尝试恢复默认数据", error);
    const defaultData = createDefaultData();
    await writeFullData(defaultData, { mutated: true, passwordReset: true });
    return { passwordReset: true };
  }
}

async function readData() {
  const fullData = await readFullData();
  return sanitiseData(fullData);
}

async function readAdminData() {
  const fullData = await readFullData();
  const data = sanitiseData(fullData);
  const weather = normaliseWeatherSettingsValue(fullData.settings?.weather);
  const cityString = Array.isArray(weather.city) ? weather.city.join(" ") : weather.city;
  data.settings.weather = {
    city: cityString,
    apiKey: weather.apiKey || "",
    query: weather.query || [],
    apiHost: weather.apiHost || "",
  };
  return data;
}

async function handleVisitorAndReadData() {
  visitorCountCache.increment += 1;
  const fullData = await readFullData();
  const data = sanitiseData(fullData);

  data.visitorCount = (data.visitorCount || 0) + visitorCountCache.increment;

  persistVisitorCountIncrement().catch((err) => {
    console.error("背景访客计数持久化失败:", err);
  });

  return data;
}

async function persistVisitorCountIncrement() {
  const now = Date.now();
  const shouldWrite =
    visitorCountCache.increment > 0 &&
    !visitorCountCache.isWriting &&
    (now - visitorCountCache.lastWriteTime > visitorCountCache.writeDelayMs ||
      visitorCountCache.increment >= visitorCountCache.writeThreshold);

  if (!shouldWrite) {
    return;
  }

  visitorCountCache.isWriting = true;
  try {
    const incrementToPersist = visitorCountCache.increment;
    visitorCountCache.increment = 0;
    visitorCountCache.lastWriteTime = now;

    const fullData = await readFullData();

    const currentCount =
      typeof fullData.stats?.visitorCount === "number" && Number.isFinite(fullData.stats.visitorCount)
        ? Math.max(0, Math.floor(fullData.stats.visitorCount))
        : DEFAULT_STATS.visitorCount;

    const nextVisitorCount = currentCount + incrementToPersist;

    const updatedData = {
      ...fullData,
      stats: { ...fullData.stats, visitorCount: nextVisitorCount },
    };

    await writeFullData(updatedData);
  } catch (error) {
    console.error("持久化访客计数失败:", error);
  } finally {
    visitorCountCache.isWriting = false;
  }
}

async function readFullData() {
  const cached = await getCachedFullDataIfFresh();
  if (cached) {
    return cached;
  }

  if (!dataCache.loadPromise) {
    dataCache.loadPromise = (async () => {
      let parsed;
      try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        parsed = JSON.parse(raw);
      } catch (error) {
        console.error("数据文件损坏，将重置为默认数据", error);
        const defaultData = createDefaultData();
        await writeFullData(defaultData, { mutated: true, passwordReset: true });
        announceDefaultPassword("数据文件已重置为默认，后台密码已重置为：admin123");
        return defaultData;
      }

      const { fullData, mutated, passwordReset } = normaliseFullData(parsed);
      const cacheInfo = { mutated, passwordReset };

      if (mutated) {
        await writeFullData(fullData, cacheInfo);
      } else {
        const meta = await readDataFileMeta();
        if (meta) {
          setDataCache(fullData, meta, cacheInfo);
        } else {
          clearDataCache();
        }
      }

      if (passwordReset) {
        announceDefaultPassword("后台密码缺失或无效，已重置为默认密码：admin123");
      }

      return fullData;
    })();
  }

  try {
    return await dataCache.loadPromise;
  } finally {
    dataCache.loadPromise = null;
  }
}

async function writeFullData(fullData, cacheInfo = { mutated: false, passwordReset: false }) {
  const payload = {
    settings: fullData.settings,
    apps: fullData.apps,
    bookmarks: fullData.bookmarks,
    stats: fullData.stats,
    admin: fullData.admin,
  };
  const serialised = JSON.stringify(payload, null, 2);
  await fs.writeFile(DATA_FILE, serialised, "utf8");
  const meta = await readDataFileMeta();
  if (meta) {
    setDataCache(fullData, meta, cacheInfo);
  } else {
    clearDataCache();
  }
}

function normaliseFullData(raw) {
  const settingsInfo = buildSettingsFromFile(raw.settings);
  const result = {
    settings: settingsInfo.value,
    apps: Array.isArray(raw.apps) ? raw.apps : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    stats: { ...DEFAULT_STATS },
    admin: null,
  };

  let mutated = settingsInfo.mutated;
  let passwordReset = false;

  if (!Array.isArray(raw.apps)) {
    mutated = true;
  }
  if (!Array.isArray(raw.bookmarks)) {
    mutated = true;
  }

  const adminInfo = normaliseAdminFromFile(raw.admin);
  result.admin = adminInfo.value;
  mutated = mutated || adminInfo.mutated;
  passwordReset = adminInfo.passwordReset;

  const statsInfo = normaliseStatsFromFile(raw.stats);
  result.stats = statsInfo.value;
  mutated = mutated || statsInfo.mutated;

  return { fullData: result, mutated, passwordReset };
}

function normaliseAdminFromFile(rawAdmin) {
  if (
    rawAdmin &&
    typeof rawAdmin === "object" &&
    typeof rawAdmin.passwordHash === "string" &&
    rawAdmin.passwordHash &&
    typeof rawAdmin.passwordSalt === "string" &&
    rawAdmin.passwordSalt
  ) {
    return { value: { passwordHash: rawAdmin.passwordHash, passwordSalt: rawAdmin.passwordSalt }, mutated: false, passwordReset: false };
  }

  const credentials = createDefaultAdminCredentials();
  return { value: credentials, mutated: true, passwordReset: true };
}

function normaliseStatsFromFile(rawStats) {
  const fallback = { ...DEFAULT_STATS };
  if (!rawStats || typeof rawStats !== "object") {
    return { value: fallback, mutated: true };
  }
  const numericVisitorCount = Number(rawStats.visitorCount);
  if (!Number.isFinite(numericVisitorCount) || numericVisitorCount < 0) {
    return { value: fallback, mutated: true };
  }
  const normalisedVisitorCount = Math.floor(numericVisitorCount);
  const value = { visitorCount: normalisedVisitorCount };
  const mutated =
    typeof rawStats.visitorCount !== "number" || normalisedVisitorCount !== numericVisitorCount;
  return { value, mutated };
}

function normaliseFooterValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}

function createDefaultWeatherSettings() {
  return {
    city: runtimeConfig.weather?.defaultCity || DEFAULT_WEATHER_CONFIG.city,
    locations: [],
    apiKey: "",
    query: [],
    apiHost: "",
  };
}

function createDefaultSettings() {
  return {
    ...BASE_DEFAULT_SETTINGS,
    weather: createDefaultWeatherSettings(),
  };
}

function extractWeatherCity(source) {
  if (!source || typeof source !== "object") {
    return { value: "", mutated: false };
  }
  const fields = ["city", "label", "name", "id"];
  for (const field of fields) {
    if (typeof source[field] === "string") {
      const raw = source[field];
      const trimmed = raw.trim();
      if (trimmed) {
        const mutated = trimmed !== raw || field !== "city";
        return { value: trimmed, mutated };
      }
      if (raw && trimmed !== raw) {
        return { value: "", mutated: true };
      }
    }
  }
  return { value: "", mutated: false };
}

function convertLegacyWeatherInput(legacy) {
  if (!legacy || typeof legacy !== "object") {
    return null;
  }
  const cityInfo = extractWeatherCity(legacy);
  if (!cityInfo.value) {
    return null;
  }
  return {
    city: cityInfo.value,
  };
}

function normaliseWeatherSettingsFromFile(rawSettings) {
  const fallback = createDefaultWeatherSettings();
  const value = { ...fallback };
  let mutated = false;

  let source = null;
  if (rawSettings && typeof rawSettings === "object") {
    if (rawSettings.weather && typeof rawSettings.weather === "object") {
      source = rawSettings.weather;
    }
    if (rawSettings.weatherLocation && typeof rawSettings.weatherLocation === "object") {
      if (!source) {
        source = rawSettings.weatherLocation;
      }
      mutated = true;
    }
  }

  if (source) {
    if (Array.isArray(source.city)) {
      const cleaned = source.city.map((city) => String(city).trim()).filter(Boolean);
      if (cleaned.length > 0) {
        value.city = cleaned;
      } else {
        mutated = true;
      }
    } else {
      const cityInfo = extractWeatherCity(source);
      if (cityInfo.value) {
        value.city = cityInfo.value;
      } else {
        mutated = true;
      }
      mutated = mutated || cityInfo.mutated;
    }

    const locations = normaliseWeatherLocationsValue(source);
    if (locations.length > 0) {
      value.locations = locations;
    } else if ("locations" in source) {
      const sourceLocations = source.locations;
      if (!Array.isArray(sourceLocations)) {
        mutated = true;
      } else if (sourceLocations.length > 0) {
        mutated = true;
      }
    }

    const apiKey = getWeatherApiKey(source);
    if (apiKey) {
      value.apiKey = apiKey;
    } else if ("apiKey" in source) {
      mutated = true;
    }

    const apiHost = normaliseApiHost(typeof source.apiHost === "string" ? source.apiHost : "");
    if (apiHost) {
      value.apiHost = apiHost;
    } else if ("apiHost" in source) {
      mutated = true;
    }

    const query = normaliseWeatherQueryInput(source);
    if (query.length > 0) {
      value.query = query;
    } else if ("query" in source) {
      mutated = true;
    }
  } else {
    mutated = true;
  }

  if (!value.city) {
    value.city = fallback.city;
    mutated = true;
  }

  return { value, mutated };
}

function normaliseWeatherSettingsValue(input) {
  const fallback = createDefaultWeatherSettings();
  let value = { ...fallback };
  const locations = normaliseWeatherLocationsValue(input);
  const apiKey = resolveApiKeyFromWeather(input);
  const apiHost = resolveQWeatherApiHost(input);
  const query = normaliseWeatherQueryInput(input);

  if (input && typeof input === "object") {
    if (typeof input.city === "string" && input.city.trim()) {
      value.city = input.city.trim().split(" ").filter(city => city);
    } else if (Array.isArray(input.city)) {
      value.city = input.city.map(city => city.trim()).filter(city => city);
    } else if (typeof input.label === "string" && input.label.trim()) {
      value.city = input.label.trim().split(" ").filter(city => city);
    }
  }

  if (locations.length > 0) {
    value.locations = locations;
  }

  if (apiKey) {
    value.apiKey = apiKey;
  }
  if (apiHost) {
    value.apiHost = apiHost;
  }
  if (query.length > 0) {
    value.query = query;
  }

  if (!value.city || value.city.length === 0) {
    if (locations.length > 0) {
      value.city = locations
        .map((location) => location.name || location.city)
        .filter((name) => typeof name === "string" && name.trim())
        .map((name) => name.trim());
    }
  }

  if (!value.city || value.city.length === 0) {
    value.city = fallback.city;
  }

  return value;
}

function getWeatherApiKey(rawWeather) {
  return typeof rawWeather?.apiKey === "string" ? rawWeather.apiKey.trim() : "";
}

function normaliseWeatherQueryInput(rawWeather) {
  if (!rawWeather || typeof rawWeather !== "object") {
    return [];
  }
  if (typeof rawWeather.query === "string") {
    const trimmed = rawWeather.query.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  }
  if (Array.isArray(rawWeather.query)) {
    return rawWeather.query.map((value) => String(value || "").trim()).filter(Boolean);
  }
  return [];
}

function alignWeatherQueries(cities, queries) {
  if (!Array.isArray(queries) || queries.length === 0) {
    return [];
  }
  if (!Array.isArray(cities) || cities.length === 0) {
    return [];
  }
  if (queries.length === 1 && cities.length > 1) {
    return Array(cities.length).fill(queries[0]);
  }
  if (queries.length >= cities.length) {
    return queries.slice(0, cities.length);
  }
  const padded = queries.slice();
  while (padded.length < cities.length) {
    padded.push("");
  }
  return padded;
}

function normaliseWeatherSettingsInput(rawWeather) {
  let source = rawWeather;
  if (!source || typeof source !== "object") {
    source = convertLegacyWeatherInput(rawWeather);
  }
  if (!source || typeof source !== "object") {
    source = createDefaultWeatherSettings();
  }

  const cityInfo = extractWeatherCity(source);
  const city = cityInfo.value;
  const apiKey = getWeatherApiKey(rawWeather);
  const query = normaliseWeatherQueryInput(rawWeather);
  const apiHost = normaliseApiHost(typeof rawWeather?.apiHost === "string" ? rawWeather.apiHost : "");
  if (!city) {
    const error = new Error("天气城市不能为空。");
    error.expose = true;
    throw error;
  }

  return {
    city: city.split(" ").filter(city => city),
    apiKey,
    query,
    apiHost,
  };
}

function normaliseWeatherLocationsValue(input) {
  if (!input || typeof input !== "object") {
    return [];
  }
  const rawLocations = Array.isArray(input.locations) ? input.locations : [];
  return rawLocations
    .map((location) => {
      if (!location || typeof location !== "object") {
        return null;
      }
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      const city = typeof location.city === "string" ? location.city.trim() : "";
      const name = typeof location.name === "string" ? location.name.trim() : "";
      const id = typeof location.id === "string" ? location.id.trim() : "";
      if (!city && !name) {
        return null;
      }
      return {
        city: city || name,
        name: name || city,
        latitude,
        longitude,
        id,
      };
    })
    .filter(Boolean);
}

function buildSettingsFromFile(rawSettings) {
  const defaults = createDefaultSettings();
  if (!rawSettings || typeof rawSettings !== "object") {
    return { value: defaults, mutated: true };
  }

  let mutated = false;
  const value = {
    siteName: defaults.siteName,
    siteLogo: defaults.siteLogo,
    greeting: defaults.greeting,
    footer: defaults.footer,
    weather: createDefaultWeatherSettings(),
  };

  const siteNameRaw = typeof rawSettings.siteName === "string" ? rawSettings.siteName : "";
  const siteName = siteNameRaw.trim();
  if (!siteName) {
    mutated = true;
  } else {
    value.siteName = siteName;
    if (siteName !== siteNameRaw) {
      mutated = true;
    }
  }

  const siteLogoRaw = typeof rawSettings.siteLogo === "string" ? rawSettings.siteLogo : "";
  const siteLogo = siteLogoRaw.trim();
  value.siteLogo = siteLogo;
  if (siteLogo !== siteLogoRaw) {
    mutated = true;
  }

  const greetingRaw = typeof rawSettings.greeting === "string" ? rawSettings.greeting : "";
  const greeting = greetingRaw.trim();
  value.greeting = greeting;
  if (greeting !== greetingRaw) {
    mutated = true;
  }

  const footerRaw = typeof rawSettings.footer === "string" ? rawSettings.footer : "";
  const footer = normaliseFooterValue(footerRaw);
  value.footer = footer;
  if (footer !== footerRaw) {
    mutated = true;
  }

  const weatherInfo = normaliseWeatherSettingsFromFile(rawSettings);
  value.weather = weatherInfo.value;
  mutated = mutated || weatherInfo.mutated;

  return { value, mutated };
}

function sanitiseData(fullData) {
  const defaults = createDefaultSettings();
  const sourceSettings =
    fullData.settings && typeof fullData.settings === "object"
      ? fullData.settings
      : defaults;

  const weather = normaliseWeatherSettingsValue(sourceSettings.weather);

  const settings = {
    siteName:
      typeof sourceSettings.siteName === "string" && sourceSettings.siteName.trim()
        ? sourceSettings.siteName.trim()
        : defaults.siteName,
    siteLogo:
      typeof sourceSettings.siteLogo === "string"
        ? sourceSettings.siteLogo.trim()
        : defaults.siteLogo,
    greeting:
      typeof sourceSettings.greeting === "string"
        ? sourceSettings.greeting.trim()
        : defaults.greeting,
    footer: normaliseFooterValue(sourceSettings.footer),
    weather: {
      city: weather.city,
    },
  };

  return {
    settings,
    apps: fullData.apps.map((item) => ({ ...item })),
    bookmarks: fullData.bookmarks.map((item) => ({ ...item })),
    visitorCount:
      typeof fullData.stats?.visitorCount === "number"
        ? fullData.stats.visitorCount
        : DEFAULT_STATS.visitorCount,
    config: {
      weather: {
        defaultCity: runtimeConfig.weather.defaultCity,
      },
    },
  };
}

async function handleDataUpdate(req, res, next) {
  try {
    const { apps, bookmarks, settings } = req.body || {};

    const normalisedApps = normaliseCollection(apps, { label: "应用", type: "apps" });
    const normalisedBookmarks = normaliseCollection(bookmarks, {
      label: "书签",
      type: "bookmarks",
    });
    let normalisedSettings;
    try {
      normalisedSettings = normaliseSettingsInput(settings);
    } catch (error) {
      console.error("设置数据格式不正确", error);
      error.expose = true;
      throw error;
    }
    const weatherLocations = await resolveWeatherLocationsFromSettings(normalisedSettings.weather);
    normalisedSettings.weather = {
      ...normalisedSettings.weather,
      locations: weatherLocations,
    };

    const existing = await readFullData();
    const payload = {
      settings: normalisedSettings,
      apps: normalisedApps,
      bookmarks: normalisedBookmarks,
      stats: existing.stats,
      admin: existing.admin,
    };

    await writeFullData(payload);
    res.json({ success: true, data: sanitiseData(payload) });
  } catch (error) {
    if (error && error.expose) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
}

async function handleWeatherTest(req, res, next) {
  try {
    const body = req.body || {};
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const queryList = normaliseWeatherQueryInput({ query: body.query });
    const query = queryList[0] || "";
    const apiHost = normaliseApiHost(typeof body.apiHost === "string" ? body.apiHost : "") || resolveQWeatherApiHost({});

    if (!city) {
      res.status(400).json({ success: false, message: "City name is required." });
      return;
    }
    if (!apiKey) {
      res.status(400).json({ success: false, message: "Missing QWeather API Key." });
      return;
    }

    const location = await geocodeCity(city, apiKey, query, apiHost);
    const weather = await fetchQWeatherNowByLocation(location, apiKey, apiHost);

    res.json({
      success: true,
      data: {
        city: location.name || city,
        ...weather,
      },
    });
  } catch (error) {
    if (error && error.expose) {
      const statusCode =
        typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600
          ? error.statusCode
          : 502;
      res.status(statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
}

async function handlePasswordUpdate(req, res, next) {
  try {
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPasswordRaw = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!currentPassword) {
      res.status(400).json({ success: false, message: "请输入当前密码。" });
      return;
    }

    const cleanNewPassword = newPasswordRaw.trim();
    if (!cleanNewPassword) {
      res.status(400).json({ success: false, message: "新密码不能为空。" });
      return;
    }

    if (cleanNewPassword.length < 6) {
      res.status(400).json({ success: false, message: "新密码长度至少为 6 位。" });
      return;
    }

    const fullData = await readFullData();
    const admin = fullData.admin;
    if (!admin || !admin.passwordHash || !admin.passwordSalt) {
      res.status(500).json({ success: false, message: "密码修改功能暂不可用，请稍后再试。" });
      return;
    }

    const storedBuffer = Buffer.from(admin.passwordHash, "hex");
    const currentHashBuffer = Buffer.from(hashPassword(currentPassword, admin.passwordSalt), "hex");

    const isMatch =
      storedBuffer.length === currentHashBuffer.length &&
      timingSafeEqual(storedBuffer, currentHashBuffer);

    if (!isMatch) {
      res.status(401).json({ success: false, message: "当前密码不正确。" });
      return;
    }

    const newHashWithExistingSalt = hashPassword(cleanNewPassword, admin.passwordSalt);
    const newHashBuffer = Buffer.from(newHashWithExistingSalt, "hex");

    if (storedBuffer.length === newHashBuffer.length && timingSafeEqual(storedBuffer, newHashBuffer)) {
      res.status(400).json({ success: false, message: "新密码不能与当前密码相同。" });
      return;
    }

    const passwordSalt = generateSalt();
    const passwordHash = hashPassword(cleanNewPassword, passwordSalt);

    const updatedData = {
      settings: fullData.settings,
      apps: fullData.apps,
      bookmarks: fullData.bookmarks,
      stats: fullData.stats,
      admin: { passwordHash, passwordSalt },
    };

    await writeFullData(updatedData);
    res.json({ success: true, message: "密码已更新，下次登录请使用新密码。" });
  } catch (error) {
    next(error);
  }
}

function normaliseSettingsInput(input) {
  const siteName = typeof input?.siteName === "string" ? input.siteName.trim() : "";
  if (!siteName) {
    const error = new Error("网站名称不能为空。");
    error.expose = true;
    throw error;
  }

  const siteLogo = typeof input?.siteLogo === "string" ? input.siteLogo.trim() : "";
  const greeting = typeof input?.greeting === "string" ? input.greeting.trim() : "";
  const footer = normaliseFooterValue(input?.footer);

  let weatherSource = null;
  if (input && typeof input === "object") {
    if (input.weather && typeof input.weather === "object") {
      weatherSource = input.weather;
    } else if (input.weatherLocation && typeof input.weatherLocation === "object") {
      weatherSource = convertLegacyWeatherInput(input.weatherLocation);
    }
  }

  let weather;
  try {
    weather = normaliseWeatherSettingsInput(weatherSource);
  } catch (error) {
    console.error("天气设置数据格式不正确", error);
    error.expose = true;
    throw error;
  }

  return {
    siteName,
    siteLogo,
    greeting,
    footer,
    weather,
  };
}

function normaliseCollection(value, { label, type }) {
  if (!Array.isArray(value)) {
    const error = new Error(`${label} 数据格式不正确，应为数组。`);
    error.expose = true;
    throw error;
  }

  const seen = new Set();
  return value.map((item) => {
    const normalised = normaliseItem(item, type);
    if (seen.has(normalised.id)) {
      normalised.id = randomUUID();
    }
    seen.add(normalised.id);
    return normalised;
  });
}

function normaliseItem(input, type) {
  if (!input || typeof input !== "object") {
    const error = new Error("数据项格式不正确。");
    error.expose = true;
    throw error;
  }

  const name = String(input.name || "").trim();
  const url = String(input.url || "").trim();
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const icon = typeof input.icon === "string" ? input.icon.trim() : "";
  const category =
    type === "bookmarks" && typeof input.category === "string" ? input.category.trim() : "";

  if (!name) {
    const error = new Error("名称不能为空。");
    error.expose = true;
    throw error;
  }

  if (!url) {
    const error = new Error("链接不能为空。");
    error.expose = true;
    throw error;
  }

  const payload = {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : randomUUID(),
    name,
    url: ensureUrlProtocol(url),
    description,
    icon,
  };

  if (type === "bookmarks") {
    payload.category = category;
  }

  return payload;
}

function ensureUrlProtocol(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function resolveDefaultWeatherConfig() {
  const resolved = { ...DEFAULT_WEATHER_CONFIG };
  const candidates = [process.env.DEFAULT_WEATHER_CITY, process.env.DEFAULT_WEATHER_LABEL];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        resolved.city = trimmed;
        break;
      }
    }
  }
  return resolved;
}

function resolveApiKeyFromWeather(weather) {
  const fromSettings = getWeatherApiKey(weather);
  if (fromSettings) {
    return fromSettings;
  }
  const fromEnv = typeof process.env.QWEATHER_API_KEY === "string" ? process.env.QWEATHER_API_KEY.trim() : "";
  return fromEnv;
}

function normaliseApiHost(rawHost) {
  if (typeof rawHost !== "string") {
    return "";
  }
  const trimmed = rawHost.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed.replace(/\/+$/, "")}`;
}

function resolveQWeatherApiHost(weather) {
  const fromSettings = normaliseApiHost(typeof weather?.apiHost === "string" ? weather.apiHost : "");
  if (fromSettings) {
    return fromSettings;
  }
  const fromEnv = normaliseApiHost(typeof process.env.QWEATHER_API_HOST === "string" ? process.env.QWEATHER_API_HOST : "");
  return fromEnv || QWEATHER_API_HOST_DEFAULT;
}

function buildQWeatherEndpoint(apiHost, path) {
  const base = normaliseApiHost(apiHost) || QWEATHER_API_HOST_DEFAULT;
  return new URL(path, `${base}/`);
}

async function resolveWeatherLocationsFromSettings(weather) {
  const apiKey = resolveApiKeyFromWeather(weather);
  const apiHost = resolveQWeatherApiHost(weather);
  const cities = Array.isArray(weather?.city) ? weather.city : [];
  const trimmedCities = cities
    .map((city) => (typeof city === "string" ? city.trim() : ""))
    .filter(Boolean);
  const queryList = alignWeatherQueries(trimmedCities, normaliseWeatherQueryInput(weather));

  if (trimmedCities.length === 0) {
    return [];
  }

  if (!apiKey) {
    const error = new Error("Missing QWeather API Key.");
    error.expose = true;
    throw error;
  }

  const locations = await Promise.all(
    trimmedCities.map(async (city, index) => {
      const location = await geocodeCity(city, apiKey, queryList[index], apiHost);
      return {
        city,
        name: location.name || city,
        latitude: location.latitude,
        longitude: location.longitude,
        id: location.id || "",
      };
    })
  );

  return locations;
}

function createWeatherError(message, statusCode = 502) {
  const error = new Error(message);
  error.expose = true;
  error.statusCode = statusCode;
  return error;
}

function getGeocodeCacheKey(city) {
  return city.toLowerCase();
}

function getCachedGeocode(city) {
  const key = getGeocodeCacheKey(city);
  const cached = geocodeCache.get(key);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.timestamp > GEOLOCATION_CACHE_TTL_MS) {
    geocodeCache.delete(key);
    return null;
  }
  return { ...cached.data };
}

function setCachedGeocode(city, data) {
  const key = getGeocodeCacheKey(city);
  geocodeCache.set(key, {
    data: { ...data },
    timestamp: Date.now(),
  });
}

async function geocodeCity(cityName, apiKey, queryOverride = "", apiHost = "") {
  const city = typeof cityName === "string" ? cityName.trim() : "";
  if (!city) {
    throw createWeatherError("City name is required.", 400);
  }
  if (!apiKey) {
    throw createWeatherError("Missing QWeather API Key.", 400);
  }
  const rawQuery = typeof queryOverride === "string" ? queryOverride.trim() : "";
  const querySource = rawQuery || city;
  const queryCity = normaliseQWeatherCityName(querySource) || querySource;

  const cached = getCachedGeocode(city);
  if (cached) {
    return cached;
  }

  let lastError = null;
  for (let attempt = 0; attempt < GEOLOCATION_MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = GEOLOCATION_RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const url = buildQWeatherEndpoint(apiHost, "/geo/v2/city/lookup");
      url.searchParams.set("location", queryCity);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("number", "1");

      const payload = await requestWeatherPayload(url, WEATHER_API_TIMEOUT_MS);
      if (!payload) {
        throw createWeatherError(`QWeather geocode error: invalid_response (city=${queryCity}).`, 502);
      }
      if (payload.code !== "200" || !Array.isArray(payload.location) || payload.location.length === 0) {
        const code = typeof payload.code === "string" ? payload.code : "invalid_response";
        throw createWeatherError(`QWeather geocode error: ${code} (city=${queryCity}).`, 502);
      }

      const result = payload.location[0];
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw createWeatherError("Invalid location data.", 502);
      }

      const locationData = {
        id: result.id || "",
        latitude,
        longitude,
        name: result.name || city,
      };

      setCachedGeocode(city, locationData);
      return locationData;
    } catch (error) {
      lastError = error;
      if (
        error &&
        error.expose &&
        typeof error.statusCode === "number" &&
        error.statusCode < 500
      ) {
        throw error;
      }
      if (attempt < GEOLOCATION_MAX_RETRIES - 1) {
        console.warn(`Geocode failed (attempt ${attempt + 1}/${GEOLOCATION_MAX_RETRIES}), retrying...`, error?.message || error);
        continue;
      }
    }
  }

  if (lastError && lastError.name === "AbortError") {
    throw createWeatherError("Geocode request timed out.", 504);
  }
  if (lastError && lastError.expose) {
    throw lastError;
  }
  throw createWeatherError("Failed to resolve city location.", 502);
}

function getWeatherCacheKey(city) {
  return city.toLowerCase();
}

function getWeatherCacheKeyForLocation(location) {
  if (location && location.id) {
    return String(location.id);
  }
  return `${location.latitude},${location.longitude}`;
}

function buildWeatherData(payload) {
  if (!payload || payload.code !== "200" || typeof payload.now !== "object") {
    const code = payload && typeof payload.code === "string" ? payload.code : "unknown";
    throw createWeatherError(`QWeather now error: ${code}.`);
  }

  const now = payload.now;
  const temperature = Number(now.temp);
  const windspeed = Number(now.windSpeed);

  return {
    text: typeof now.text === "string" ? now.text : "Unknown",
    temperature: Number.isFinite(temperature) ? temperature : null,
    windspeed: Number.isFinite(windspeed) ? windspeed : null,
    weathercode: now.icon || now.code || null,
    time: now.obsTime || null,
  };
}

async function fetchQWeatherNowByLocation(location, apiKey, apiHost = "") {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw createWeatherError("Invalid location data.", 400);
  }
  if (!apiKey) {
    throw createWeatherError("Missing QWeather API Key.", 400);
  }

  const cacheKey = getWeatherCacheKeyForLocation({
    id: location?.id,
    latitude,
    longitude,
  });
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return cached.data;
  }

  const locationQuery = location?.id ? String(location.id) : `${longitude},${latitude}`;
  const url = buildQWeatherEndpoint(apiHost, "/v7/weather/now");
  url.searchParams.set("location", locationQuery);
  url.searchParams.set("key", apiKey);

  try {
    const payload = await requestWeatherPayload(url, WEATHER_API_TIMEOUT_MS);
    const weatherData = buildWeatherData(payload);

    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now(),
    });

    return weatherData;
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw createWeatherError("Weather request timed out.", 504);
    }
    if (error && error.expose) {
      throw error;
    }
    throw createWeatherError("Weather request failed.", 502);
  }
}

async function fetchQWeatherNowByCity(cityName, apiKey, queryOverride = "", apiHost = "") {
  const city = typeof cityName === "string" ? cityName.trim() : "";
  if (!city) {
    throw createWeatherError("City name is required.", 400);
  }

  const location = await geocodeCity(city, apiKey, queryOverride, apiHost);
  return fetchQWeatherNowByLocation(location, apiKey, apiHost);
}

function getWeatherDescription(code) {
  const weatherCodeMap = {
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

  return weatherCodeMap[code] || "未知";
}

async function requestWeatherPayload(url, timeoutMs) {
  if (typeof fetch === "function" && typeof AbortController === "function") {
    const payload = await requestWeatherPayloadWithNativeFetch(url, timeoutMs);
    if (payload) {
      return payload;
    }
    return requestWeatherPayloadWithNodeHttp(url, timeoutMs);
  }
  return requestWeatherPayloadWithNodeHttp(url, timeoutMs);
}

async function requestWeatherPayloadWithNativeFetch(url, timeoutMs) {
  const controller = new AbortController();
  let timeoutId = null;

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: WEATHER_FETCH_HEADERS,
    });
    const raw = await response.text().catch(() => "");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function requestWeatherPayloadWithNodeHttp(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const options = {
      method: "GET",
      hostname: url.hostname,
      port: url.port ? Number(url.port) : isHttps ? 443 : 80,
      path: `${url.pathname}${url.search}`,
      headers: WEATHER_HTTP_HEADERS,
    };

    const request = transport.request(options, (response) => {
      const chunks = [];
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }

        const buffer = Buffer.concat(chunks);
        const encoding = response.headers["content-encoding"];
        const finalize = (payloadBuffer) => {
          const raw = payloadBuffer.toString("utf8");
          if (!raw) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (_error) {
            resolve(null);
          }
        };

        if (encoding && String(encoding).includes("br")) {
          zlib.brotliDecompress(buffer, (error, decoded) => {
            if (error) {
              reject(error);
              return;
            }
            finalize(decoded);
          });
          return;
        }

        if (encoding && String(encoding).includes("gzip")) {
          zlib.gunzip(buffer, (error, decoded) => {
            if (error) {
              reject(error);
              return;
            }
            finalize(decoded);
          });
          return;
        }

        finalize(buffer);
      });
      response.on("error", reject);
    });

    request.on("error", reject);

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      request.setTimeout(timeoutMs, () => {
        const timeoutError = new Error("Request timed out");
        timeoutError.name = "AbortError";
        request.destroy(timeoutError);
      });
    }

    request.end();
  });
}

async function resolveWeatherRequestConfig() {
  const fullData = await readFullData();
  const weather = normaliseWeatherSettingsValue(fullData.settings?.weather);
  const locations = Array.isArray(weather.locations) ? weather.locations : [];
  const apiKey = resolveApiKeyFromWeather(weather);
  const apiHost = resolveQWeatherApiHost(weather);
  let cities = weather.city;
  if (!Array.isArray(cities)) {
    cities = [cities || runtimeConfig.weather.defaultCity || DEFAULT_WEATHER_CONFIG.city].filter(Boolean);
  }
  return {
    city: cities,
    locations,
    apiKey,
    apiHost,
    query: weather.query || [],
  };
}

function createDefaultData() {
  const admin = createDefaultAdminCredentials();
  return {
    settings: createDefaultSettings(),
    stats: { ...DEFAULT_STATS },
    apps: [
      {
        id: randomUUID(),
        name: "Figma",
        url: "https://www.figma.com/",
        description: "协作式界面设计工具。",
        icon: "🎨",
      },
      {
        id: randomUUID(),
        name: "Notion",
        url: "https://www.notion.so/",
        description: "多合一的笔记与知识管理平台。",
        icon: "🗂️",
      },
      {
        id: randomUUID(),
        name: "Slack",
        url: "https://slack.com/",
        description: "团队即时沟通与协作中心。",
        icon: "💬",
      },
      {
        id: randomUUID(),
        name: "GitHub",
        url: "https://github.com/",
        description: "代码托管与协作平台。",
        icon: "🐙",
      },
      {
        id: randomUUID(),
        name: "Canva",
        url: "https://www.canva.com/",
        description: "简单易用的在线设计工具。",
        icon: "🖌️",
      },
    ],
    bookmarks: [
      {
        id: randomUUID(),
        name: "开源中国",
        url: "https://www.oschina.net/",
        description: "聚焦开源信息与技术社区。",
        icon: "🌐",
        category: "技术社区",
      },
      {
        id: randomUUID(),
        name: "少数派",
        url: "https://sspai.com/",
        description: "关注效率工具与生活方式的媒体。",
        icon: "📰",
        category: "效率与生活",
      },
      {
        id: randomUUID(),
        name: "知乎",
        url: "https://www.zhihu.com/",
        description: "问答与知识分享社区。",
        icon: "❓",
        category: "知识学习",
      },
      {
        id: randomUUID(),
        name: "即刻",
        url: "https://m.okjike.com/",
        description: "兴趣社交与资讯聚合平台。",
        icon: "📮",
        category: "资讯聚合",
      },
      {
        id: randomUUID(),
        name: "稀土掘金",
        url: "https://juejin.cn/",
        description: "开发者技术社区与优质内容。",
        icon: "💡",
        category: "技术社区",
      },
    ],
    admin,
  };
}

function createDefaultAdminCredentials() {
  const passwordSalt = generateSalt();
  const passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD, passwordSalt);
  return { passwordHash, passwordSalt };
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function generateSalt() {
  return randomBytes(16).toString("hex");
}

function createAuthToken() {
  return randomUUID();
}

function extractToken(req) {
  const raw = req.get("authorization") || req.get("Authorization");
  if (!raw || typeof raw !== "string") {
    return null;
  }
  if (!raw.startsWith(AUTH_HEADER_PREFIX)) {
    return null;
  }
  const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
  return token || null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: "请登录后再执行此操作。" });
    return;
  }

  const session = activeSessions.get(token);
  if (!session) {
    res.status(401).json({ success: false, message: "登录状态已失效，请重新登录。" });
    return;
  }

  if (Date.now() - session.createdAt > SESSION_TTL) {
    activeSessions.delete(token);
    res.status(401).json({ success: false, message: "登录已过期，请重新登录。" });
    return;
  }

  session.lastSeen = Date.now();
  req.authToken = token;
  next();
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      activeSessions.delete(token);
    }
  }
}

function announceDefaultPassword(message) {
  console.log(message);
}
