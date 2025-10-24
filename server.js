const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "navigation.json");

const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/api/data", async (_req, res, next) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.put("/api/data", async (req, res, next) => {
  try {
    const { apps, bookmarks } = req.body || {};

    const normalisedApps = normaliseCollection(apps, { label: "应用", type: "apps" });
    const normalisedBookmarks = normaliseCollection(bookmarks, {
      label: "书签",
      type: "bookmarks",
    });

    const payload = {
      apps: normalisedApps,
      bookmarks: normalisedBookmarks,
    };

    await writeData(payload);
    res.json({ success: true, data: payload });
  } catch (error) {
    if (error && error.expose) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

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
  try {
    await fs.access(DATA_FILE);
  } catch (_error) {
    const initialData = createDefaultData();
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

async function readData() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    apps: Array.isArray(parsed.apps) ? parsed.apps : [],
    bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
  };
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
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
  return {
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
  };
}
