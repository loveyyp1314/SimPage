<p align="center">
  <img src="./public/simpage-logo.svg" alt="SimPage Logo" width="160" />
</p>

# SimPage · 现代化导航页

一个集成时间问候、天气信息、智能搜索，以及应用与书签快捷入口的现代化导航页示例。项目提供后台编辑页面，并将数据持久化在本地文件中，便于轻量快速地部署和管理。

## 功能特性

- **概览区域**：展示当前时间、日期、问候语及实时天气信息，并提供全局搜索入口。
- **应用与书签分区**：两大模块采用自适应 4-5 列网格排布，支持自由缩放，卡片包含图标、名称与描述信息。
- **后台编辑页面**：无需额外数据库，通过后台页面即可新增、修改或删除应用与书签条目。
- **后台权限控制**：后台页面需密码登录（默认密码 `admin123`），密码信息保存在本地数据文件中，便于自定义。
- **站点信息配置**：可在后台设置网站名称、Logo 以及概览区域下方的自定义问候语，前台实时同步展示。
- **开放天气服务**：使用完全免费的 Open-Meteo API 获取天气信息，无需注册和 API Key，后台直接填写城市名称即可。
- **书签分类提示**：录入书签时自动列出现有子分类，快速保持分类一致性。
- **文件化存储**：导航数据保存在 `data/navigation.json` 文件中，便于备份、版本控制与离线修改。
- **响应式与毛玻璃视觉**：延续灰白极简风格与毛玻璃效果，在桌面与移动端均有优秀的浏览体验。

## 品牌视觉

- 仓库内提供了 `public/simpage-logo.svg` 作为轻量级的 SimPage 品牌 Logo，顶部展示的图标即来源于该文件。
- 部署时可直接复用该 Logo，或在此基础上调整配色与排版以匹配自有品牌。

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动本地服务：
   ```bash
   npm start
   ```
3. 在浏览器访问：
   - 前台导航页：[`http://localhost:3000/`](http://localhost:3000/)
   - 后台编辑页：[`http://localhost:3000/admin`](http://localhost:3000/admin.html)

4. 更新
   ```bash
   git pull
   ```

> 后台首次登录请使用默认密码 `admin123`，可在 `data/navigation.json` 中更新密码散列。
> 天气信息通过 [Open-Meteo](https://open-meteo.com/) 开源免费 API 获取，无需注册和 API Key，后台所选城市决定展示内容；若未配置则使用默认城市（可通过环境变量覆盖）。

## Docker Compose 部署

项目附带精简的 Docker 部署方案，镜像基于 `node:20-alpine` 构建，仅安装生产依赖并启用健康检查，以在保证性能的前提下降低资源占用。

1. 手动构建镜像：
   ```bash
   docker compose build
   ```
   如需强制刷新依赖，可追加 `--no-cache`。

2. 后台启动服务：
   ```bash
   docker compose up -d
   ```
   若仍使用旧版 `docker-compose`，可替换为 `docker-compose up -d`。

3. 查看运行日志：
   ```bash
   docker compose logs -f navigation
   ```

4. 停止容器（保留数据）：
   ```bash
   docker compose down
   ```
5. 更新
   ```bash
   git pull
   ```
重新构建镜像 -> docker-compose up -d

以上命令同样适用于旧版 `docker-compose` CLI，只需将 `docker compose` 替换为 `docker-compose`。

部署配置要点：

- 服务默认监听宿主机 `3000` 端口，可在 `docker-compose.yml` 中调整端口映射或 `PORT` 环境变量。
- 命名卷 `navigation_data` 会持久化 `/app/data` 下的导航配置与后台密码，镜像重建时数据不会丢失。
- 可通过 `DEFAULT_WEATHER_CITY` 环境变量自定义默认天气城市，默认值为"北京"，Docker Compose 示例已默认填充，可按需修改。
- 天气服务使用 Open-Meteo 开源免费 API，无需配置 API Key。
- `docker-compose.yml` 中预设 `mem_limit`、`mem_reservation` 与 `cpus`，默认限制为 0.5 核、512MiB 上限及 128MiB 预留，可按实际资源情况调整。
- 更新代码后重新运行 `docker compose build` 与 `docker compose up -d` 以应用最新版本。

## 运行时配置

- `DEFAULT_WEATHER_CITY`：默认天气城市的名称（后台未选择城市时使用），默认值 `北京`

## 数据管理

- 导航数据位于 `data/navigation.json`，结构示例：
  ```json
  {
    "settings": {
      "siteName": "SimPage",
      "siteLogo": "",
      "greeting": "",
      "footer": "",
      "weather": {
        "city": "北京"
      }
    },
    "apps": [
      {
        "id": "app-figma",
        "name": "Figma",
        "url": "https://www.figma.com/",
        "description": "协作式界面设计工具。",
        "icon": "🎨"
      }
    ],
    "bookmarks": [
      {
        "id": "bookmark-oschina",
        "name": "开源中国",
        "url": "https://www.oschina.net/",
        "description": "聚焦开源信息与技术社区。",
        "icon": "🌐",
        "category": "技术社区"
      }
    ],
    "admin": {
      "passwordHash": "<已省略>",
      "passwordSalt": "<已省略>"
    }
  }
  ```
- 可直接通过后台页面完成增删改操作并保存；服务端会自动为缺失的条目生成唯一 `id`，并确保链接包含协议头。
- 若需修改后台密码，请生成新的 `passwordSalt` 与 `passwordHash`（可使用 Node.js `crypto.scryptSync`），并更新至 `navigation.json`。

## 目录结构

```
├── data/
│   └── navigation.json        # 导航数据源
├── public/
│   ├── admin.html             # 后台编辑页面
│   ├── index.html             # 前台导航页面
│   ├── scripts/
│   │   ├── admin.js           # 后台交互逻辑
│   │   └── main.js            # 前台交互逻辑
│   └── styles.css             # 全局样式
├── server.js                  # Express 服务端入口
├── package.json               # 项目依赖与脚本
└── README.md
```

## 部署方案

SimPage 支持多种部署方式，满足不同用户的需求：

### 🚀 快速部署

#### 1. Node.js 部署（推荐）
适合有服务器或 VPS 的用户：
```bash
npm install
npm start
```
访问 `http://localhost:3000` 即可使用。

#### 2. Docker Compose 部署
最简单的容器化部署：
```bash
docker compose up -d
```
数据自动持久化，支持一键更新。

### 🌐 无服务器部署

#### 3. Cloudflare Workers 部署
利用全球边缘网络，无需服务器：

1. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. 创建 KV 命名空间：
   ```bash
   wrangler kv:namespace create "NAVIGATION_DATA"
   wrangler kv:namespace create "NAVIGATION_SESSIONS"
   ```

3. 更新 `wrangler.toml` 配置中的命名空间 ID

4. 部署：
   ```bash
   wrangler deploy
   ```

**特点**：
- ✅ 全球 CDN 加速，访问速度快
- ✅ 自动扩容，无需运维
- ✅ 免费额度每天 10 万次请求
- ✅ 数据存储在 Cloudflare KV

#### 4. GitHub Pages 部署
完全免费的静态部署方案：

1. Fork 本仓库到你的 GitHub 账号
2. 在仓库设置中启用 GitHub Pages
   - 进入 `Settings` > `Pages`
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`，目录选择 `/public`
3. 访问 `https://<你的用户名>.github.io/<仓库名>/`

**特点**：
- ✅ 完全免费
- ✅ 支持自定义域名
- ⚠️ 仅支持静态内容（无后台编辑功能）
- ⚠️ 数据存储在浏览器 localStorage（仅本地）

### 📊 部署方案对比

| 部署方式 | 难度 | 费用 | 数据持久化 | 后台功能 | 推荐场景 |
|---------|------|------|-----------|---------|---------|
| Node.js | ⭐⭐ | 💰💰 | ✅ 文件存储 | ✅ 完整支持 | 有服务器的用户 |
| Docker | ⭐ | 💰💰 | ✅ 数据卷 | ✅ 完整支持 | 喜欢容器化的用户 |
| Cloudflare Workers | ⭐⭐⭐ | 💰 免费层 | ✅ KV 存储 | ✅ 完整支持 | 追求高性能和全球访问 |
| GitHub Pages | ⭐ | 💰 完全免费 | ⚠️ 仅本地 | ❌ 仅查看 | 个人静态导航页 |

### 📖 详细部署文档

完整的部署指南请查看 [DEPLOY.md](./DEPLOY.md)，包括：
- 各部署方式的详细步骤
- 环境变量配置
- 自定义域名设置
- 数据备份与恢复
- 常见问题排查

## 自定义与管理

- 可在 `navigation.json` 中预先填充企业或个人常用的应用与书签。
- 后台管理页面支持可视化编辑，无需手动修改文件。
- 支持自定义站点名称、Logo、问候语和页脚信息。

祝使用愉快！
