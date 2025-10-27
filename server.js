const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID, scryptSync, timingSafeEqual, randomBytes } = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "navigation.json");

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

const WEATHER_API_TIMEOUT_MS = 5_000;
const QWEATHER_API_KEY = resolveQWeatherApiKey();

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
    const admin = fullData.admin;
    if (!admin || !admin.passwordSalt || !admin.passwordHash) {
      res.status(500).json({ success: false, message: "登录功能暂不可用，请稍后再试。" });
      return;
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
    const data = await incrementVisitorCountAndReadData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/api/config", (_req, res) => {
  res.json({
    weather: {
      defaultCity: runtimeConfig.weather.defaultCity,
    },
  });
});

app.get("/api/weather", async (_req, res, next) => {
  try {
    const config = await resolveWeatherRequestConfig();
    if (!config.city) {
      res.status(503).json({ success: false, message: "尚未配置天气城市，请联系管理员。" });
      return;
    }

    if (!config.apiKey) {
      res.status(503).json({ success: false, message: "天气服务未配置，请联系管理员。" });
      return;
    }

    const weather = await fetchQWeatherNow(config.city, config.apiKey);
    res.json({ success: true, data: { ...weather, city: config.city } });
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

app.put("/api/admin/data", requireAuth, handleDataUpdate);
app.put("/api/data", requireAuth, handleDataUpdate);
app.post("/api/admin/password", requireAuth, handlePasswordUpdate);

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
  data.settings.weather = {
    city: weather.city,
    apiKey: weather.apiKey,
  };
  return data;
}

async function incrementVisitorCountAndReadData() {
  const fullData = await readFullData();
  const currentCount =
    typeof fullData.stats?.visitorCount === "number" && Number.isFinite(fullData.stats.visitorCount)
      ? Math.max(0, Math.floor(fullData.stats.visitorCount))
      : DEFAULT_STATS.visitorCount;
  const nextVisitorCount = currentCount + 1;
  const updatedData = {
    settings: fullData.settings,
    apps: fullData.apps,
    bookmarks: fullData.bookmarks,
    stats: { visitorCount: nextVisitorCount },
    admin: fullData.admin,
  };

  await writeFullData(updatedData);
  return sanitiseData(updatedData);
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
    apiKey: "",
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

function extractWeatherApiKey(source) {
  if (!source || typeof source !== "object") {
    return { value: "", mutated: false };
  }
  const fields = ["apiKey", "key"];
  for (const field of fields) {
    if (typeof source[field] === "string") {
      const raw = source[field];
      const trimmed = raw.trim();
      if (trimmed || raw) {
        const mutated = trimmed !== raw || field !== "apiKey";
        return { value: trimmed, mutated };
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
  const apiKeyInfo = extractWeatherApiKey(legacy);
  if (!cityInfo.value && !apiKeyInfo.value) {
    return null;
  }
  return {
    city: cityInfo.value,
    apiKey: apiKeyInfo.value,
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
    const cityInfo = extractWeatherCity(source);
    if (cityInfo.value) {
      value.city = cityInfo.value;
    } else {
      mutated = true;
    }
    mutated = mutated || cityInfo.mutated;

    const apiKeyInfo = extractWeatherApiKey(source);
    value.apiKey = apiKeyInfo.value;
    mutated = mutated || apiKeyInfo.mutated;
  } else {
    mutated = true;
  }

  if (!value.city) {
    value.city = fallback.city;
    mutated = true;
  }

  if (typeof value.apiKey !== "string") {
    value.apiKey = "";
    mutated = true;
  }

  return { value, mutated };
}

function normaliseWeatherSettingsValue(input) {
  const fallback = createDefaultWeatherSettings();
  const value = { ...fallback };

  if (input && typeof input === "object") {
    if (typeof input.city === "string" && input.city.trim()) {
      value.city = input.city.trim();
    } else if (typeof input.label === "string" && input.label.trim()) {
      value.city = input.label.trim();
    }
    if (typeof input.apiKey === "string") {
      value.apiKey = input.apiKey.trim();
    } else if (typeof input.key === "string") {
      value.apiKey = input.key.trim();
    } else {
      value.apiKey = "";
    }
  }

  if (!value.city) {
    value.city = fallback.city;
  }

  return value;
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
  if (!city) {
    const error = new Error("天气城市不能为空。");
    error.expose = true;
    throw error;
  }

  const apiKeyInfo = extractWeatherApiKey(source);

  return {
    city,
    apiKey: apiKeyInfo.value,
  };
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
    const normalisedSettings = normaliseSettingsInput(settings);

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

  const weather = normaliseWeatherSettingsInput(weatherSource);

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

function createWeatherError(message, statusCode = 502) {
  const error = new Error(message);
  error.expose = true;
  error.statusCode = statusCode;
  return error;
}

function resolveQWeatherErrorMessage(code) {
  const mapping = {
    "204": "暂时无该地区的天气数据，请稍后重试。",
    "400": "天气服务请求参数无效。",
    "401": "天气服务认证失败，请联系管理员。",
    "402": "天气服务已超出调用额度，请稍后再试。",
    "403": "天气服务权限不足。",
    "404": "天气服务资源不存在。",
    "429": "天气服务请求过于频繁，请稍后再试。",
    "500": "天气服务暂时不可用，请稍后重试。",
  };
  const codeText =
    typeof code === "string" && code.trim()
      ? code.trim()
      : typeof code === "number" && Number.isFinite(code)
      ? String(code)
      : "";
  if (!codeText) {
    return "天气服务获取失败，请稍后重试。";
  }
  return mapping[codeText] || "天气服务获取失败，请稍后重试。";
}

async function fetchQWeatherNow(locationQuery, apiKey) {
  const location = typeof locationQuery === "string" ? locationQuery.trim() : "";
  if (!location) {
    throw createWeatherError("天气服务位置无效。", 400);
  }
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    throw createWeatherError("天气服务未配置，请联系管理员。", 503);
  }

  const url = new URL("https://devapi.qweather.com/v7/weather/now");
  url.searchParams.set("location", location);
  url.searchParams.set("key", key);
  url.searchParams.set("lang", "zh");
  url.searchParams.set("unit", "m");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEATHER_API_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      throw createWeatherError("天气服务响应异常，请稍后重试。");
    }

    const codeText =
      typeof payload.code === "string" && payload.code.trim()
        ? payload.code.trim()
        : typeof payload.code === "number" && Number.isFinite(payload.code)
        ? String(payload.code)
        : "";

    if (codeText !== "200" || !payload.now) {
      const message = resolveQWeatherErrorMessage(codeText);
      const statusCodeMap = {
        "400": 400,
        "401": 503,
        "402": 503,
        "403": 503,
        "404": 404,
        "429": 429,
        "500": 503,
      };
      const statusCode = statusCodeMap[codeText] || 502;
      throw createWeatherError(message, statusCode);
    }

    const description =
      typeof payload.now.text === "string" && payload.now.text.trim()
        ? payload.now.text.trim()
        : "";
    const temperatureValue = Number(payload.now.temp);
    const feelsLikeValue = Number(payload.now.feelsLike);
    const icon =
      typeof payload.now.icon === "string" && payload.now.icon.trim() ? payload.now.icon.trim() : "";
    const obsTime =
      typeof payload.now.obsTime === "string" && payload.now.obsTime.trim()
        ? payload.now.obsTime.trim()
        : "";

    return {
      text: description,
      temperature: Number.isFinite(temperatureValue) ? temperatureValue : null,
      feelsLike: Number.isFinite(feelsLikeValue) ? feelsLikeValue : null,
      icon: icon || null,
      obsTime: obsTime || null,
    };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw createWeatherError("天气服务请求超时，请稍后重试。", 504);
    }
    if (error && error.expose) {
      throw error;
    }
    throw createWeatherError("天气服务获取失败，请稍后重试。", 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveWeatherRequestConfig() {
  const fullData = await readFullData();
  const weather = normaliseWeatherSettingsValue(fullData.settings?.weather);
  const city = weather.city || runtimeConfig.weather.defaultCity || DEFAULT_WEATHER_CONFIG.city;
  const storedKey = typeof weather.apiKey === "string" ? weather.apiKey.trim() : "";
  const apiKey = storedKey || QWEATHER_API_KEY;
  return {
    city,
    apiKey,
    source: storedKey ? "settings" : apiKey ? "env" : "none",
  };
}

function resolveQWeatherApiKey() {
  const candidates = [process.env.QWEATHER_API_KEY, process.env.HEWEATHER_API_KEY];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
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
