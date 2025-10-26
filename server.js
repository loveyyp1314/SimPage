const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID, scryptSync, timingSafeEqual, randomBytes } = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "navigation.json");

const DEFAULT_SETTINGS = {
  siteName: "SimPage",
  siteLogo: "",
  greeting: "",
  footer: "",
};

const DEFAULT_STATS = {
  visitorCount: 0,
};

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

app.get("/api/admin/data", requireAuth, async (_req, res, next) => {
  try {
    const data = await readData();
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
  const result = {
    settings: buildSettingsFromFile(raw.settings),
    apps: Array.isArray(raw.apps) ? raw.apps : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    stats: { ...DEFAULT_STATS },
    admin: null,
  };

  let mutated = false;
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

  if (!raw.settings || typeof raw.settings !== "object") {
    mutated = true;
  } else {
    const originalSettings = {
      siteName: typeof raw.settings.siteName === "string" ? raw.settings.siteName.trim() : "",
      siteLogo: typeof raw.settings.siteLogo === "string" ? raw.settings.siteLogo.trim() : "",
      greeting: typeof raw.settings.greeting === "string" ? raw.settings.greeting.trim() : "",
      footer: typeof raw.settings.footer === "string" ? raw.settings.footer.trim() : "",
    };
    if (
      originalSettings.siteName !== result.settings.siteName ||
      originalSettings.siteLogo !== result.settings.siteLogo ||
      originalSettings.greeting !== result.settings.greeting ||
      originalSettings.footer !== result.settings.footer
    ) {
      mutated = true;
    }
  }

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

function buildSettingsFromFile(rawSettings) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!rawSettings || typeof rawSettings !== "object") {
    return settings;
  }
  if (typeof rawSettings.siteName === "string" && rawSettings.siteName.trim()) {
    settings.siteName = rawSettings.siteName.trim();
  }
  if (typeof rawSettings.siteLogo === "string") {
    settings.siteLogo = rawSettings.siteLogo.trim();
  }
  if (typeof rawSettings.greeting === "string") {
    settings.greeting = rawSettings.greeting.trim();
  }
  if (typeof rawSettings.footer === "string") {
    settings.footer = normaliseFooterValue(rawSettings.footer);
  }
  return settings;
}

function sanitiseData(fullData) {
  return {
    settings: { ...fullData.settings },
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

  return {
    siteName,
    siteLogo,
    greeting,
    footer,
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

function createDefaultData() {
  const admin = createDefaultAdminCredentials();
  return {
    settings: { ...DEFAULT_SETTINGS },
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
