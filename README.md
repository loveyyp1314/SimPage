<p align="center">
  <img src="./public/simpage-logo.svg" alt="SimPage Logo" width="160" />
</p>

# SimPage · 现代化导航页

一个集成时间问候、天气信息、智能搜索，以及应用与书签快捷入口的现代化导航页示例。项目已适配 **Cloudflare Workers**，通过 KV 存储实现数据持久化，提供后台编辑页面，便于轻量快速地部署和管理。

## 功能特性

- **概览区域**：展示当前时间、日期、问候语及实时天气信息，并提供全局搜索入口，支持亮暗主题切换并可随系统主题自动切换。
- **应用与书签分区**：两大模块采用自适应 4-5 列网格排布，支持自由缩放，卡片包含图标、名称与描述信息。
- **后台编辑页面**：无需额外数据库，通过后台页面即可新增、修改或删除应用与书签条目。
- **后台权限控制**：后台页面需密码登录（默认密码 `admin123`），密码信息保存在本地数据文件中，便于自定义。
- **站点信息配置**：可在后台设置网站名称、Logo 以及概览区域下方的自定义问候语，前台实时同步展示。
- **开放天气服务**：使用完全免费的 Open-Meteo API 获取天气信息，无需注册和 API Key，后台直接填写城市名称即可，可输入多个城市以空格隔开，首页间隔5秒滚动显示。
- **书签分类提示**：录入书签时自动列出现有子分类，快速保持分类一致性。
- **KV 数据存储**：导航数据保存在 Cloudflare KV 中，确保高性能与高可用性。
- **响应式与毛玻璃视觉**：延续灰白极简风格与毛玻璃效果，在桌面与移动端均有优秀的浏览体验。

## 品牌视觉

- 仓库内提供了 `public/simpage-logo.svg` 作为轻量级的 SimPage 品牌 Logo，顶部展示的图标即来源于该文件。
- 部署时可直接复用该 Logo，或在此基础上调整配色与排版以匹配自有品牌。

## 传统 Node.js 部署

如果您仍希望使用传统的 Node.js 服务器模式，可以继续使用 `server.js`。

### 1. 安装依赖

```bash
npm install
```
### 2. 启动服务

```bash
# 启动 Node.js 服务器
npm start
```
### 3. 后台运行[推荐使用 PM2]

1. 全局安装 PM2

```bash
npm install pm2 -g
```
2. 使用 PM2 启动你的应用

```bash
pm2 start npm --name "SimPage" -- start
```

3. 常用 PM2 命令

```bash
pm2 list          # 查看所有正在运行的应用
pm2 status        # 查看所有应用的状态 (和 list 类似)
pm2 logs my-app   # 查看 "my-app" 的实时日志
pm2 stop my-app     # 停止 "my-app"
pm2 restart my-app  # 重启 "my-app"
pm2 delete my-app   # 从 PM2 列表中删除 "my-app"
```

4. 设置开机自启

```bash
pm2 startup
# (它会生成类似 sudo env PATH=... 的命令，复制并执行它)

# 保存当前的应用列表，以便在重启后恢复
pm2 save
```

> 请注意，`server.js` 和 Cloudflare Worker (`worker.js`) 使用不同的数据存储方式（文件 vs KV），数据不互通。


## Cloudflare Workers 部署

本项目已完全适配 Cloudflare Workers，推荐使用此方式进行部署。

### 1. 环境准备

- 一个 [Cloudflare](https://www.cloudflare.com/) 账户。
- 已安装 [Node.js](https://nodejs.org/) 和 npm。

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Wrangler

1.  **登录 Wrangler**:
    ```bash
    npx wrangler login
    ```
    这将引导您在浏览器中登录 Cloudflare 账户并授权 Wrangler。

2.  **创建 KV 命名空间**:
    您需要创建两个 KV 命名空间来存储应用数据和用户会话。
    ```bash
    npx wrangler kv:namespace create "SIMPAGE_DATA"
    npx wrangler kv:namespace create "SESSIONS"
    ```
    执行上述命令后，Wrangler 会输出每个命名空间的 `id`。静态网站内容将通过下文的 `[site]` 配置自动处理，无需手动创建对应的 KV。

3.  **更新 `wrangler.toml`**:
    将上一步获取到的 `id` 填入 `wrangler.toml` 文件对应的 `kv_namespaces` 部分。`preview_id` 可留空或填写与 `id` 相同的值。

    ```toml
    # wrangler.toml

    kv_namespaces = [
      { binding = "SIMPAGE_DATA", id = "your_simpage_data_id", preview_id = "your_simpage_data_id" },
      { binding = "SESSIONS", id = "your_sessions_id", preview_id = "your_sessions_id" }
    ]

    # ... 其他配置
    [site]
    bucket = "./public"
    ```

### 4. 本地开发

使用 `dev` 命令启动本地开发服务器，它会模拟 Cloudflare 环境，并支持热重载。

```bash
npm run dev
```

- 前台导航页：[`http://localhost:8787/`](http://localhost:8787/)
- 后台编辑页：[`http://localhost:8787/admin`](http://localhost:8787/admin)

> 后台首次登录请使用默认密码 `admin123`。

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

部署成功后，Wrangler 会输出您的 Worker URL，通过该 URL 即可访问您的导航页。

### 5. 更新

```bash
git pull
npm run deploy
```

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

- 导航数据、会话和静态资源均存储在 Cloudflare KV 中。
- 首次部署后，Worker 会自动使用默认数据初始化 `SIMPAGE_DATA` KV。
- 所有数据（包括后台密码）均可通过后台页面进行管理和修改。

## 目录结构

```
├── public/                  # 静态资源目录
│   ├── admin.html           # 后台编辑页面
│   ├── index.html           # 前台导航页面
│   ├── scripts/
│   └── styles.css
├── worker.js                # Cloudflare Worker 入口脚本
├── wrangler.toml            # Wrangler 配置文件
├── package.json             # 项目依赖与脚本
└── README.md
```

祝使用愉快！
