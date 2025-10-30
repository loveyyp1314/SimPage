# 部署指南

本项目支持多种部署方式，包括传统的 Node.js 服务器、Docker、Cloudflare Workers 和 GitHub Pages。

## 目录

- [Node.js 部署](#nodejs-部署)
- [Docker Compose 部署](#docker-compose-部署)
- [Cloudflare Workers 部署](#cloudflare-workers-部署)
- [GitHub Pages 部署](#github-pages-部署)

---

## Node.js 部署

适合有 VPS 或服务器的用户。

### 前置要求

- Node.js 18+ 
- npm 或 yarn

### 部署步骤

1. 克隆仓库：
   ```bash
   git clone <your-repo-url>
   cd simpage
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动服务：
   ```bash
   npm start
   ```

4. 访问应用：
   - 前台：http://localhost:3000
   - 后台：http://localhost:3000/admin

### 生产环境部署

推荐使用 PM2 进行进程管理：

```bash
npm install -g pm2
pm2 start server.js --name simpage
pm2 save
pm2 startup
```

使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker Compose 部署

最简单的容器化部署方式。

### 前置要求

- Docker 20.10+
- Docker Compose v2 (或 docker-compose v1.28+)

### 部署步骤

1. 克隆仓库：
   ```bash
   git clone <your-repo-url>
   cd simpage
   ```

2. 构建并启动容器：
   ```bash
   docker compose up -d
   ```

3. 查看日志：
   ```bash
   docker compose logs -f navigation
   ```

4. 访问应用：
   - 前台：http://localhost:3000
   - 后台：http://localhost:3000/admin

### 配置说明

在 `docker-compose.yml` 中可以配置：

- **端口映射**：修改 `ports` 部分
- **环境变量**：
  - `PORT`: 服务端口（默认 3000）
  - `DEFAULT_WEATHER_CITY`: 默认天气城市（默认"北京"）
- **资源限制**：`mem_limit`、`mem_reservation`、`cpus`

### 数据持久化

数据存储在 Docker 命名卷 `navigation_data` 中，即使删除容器也不会丢失。

备份数据：
```bash
docker compose exec navigation cat /app/data/navigation.json > backup.json
```

恢复数据：
```bash
docker compose cp backup.json navigation:/app/data/navigation.json
docker compose restart navigation
```

---

## Cloudflare Workers 部署

利用 Cloudflare 的边缘计算平台，无需服务器即可部署。

### 前置要求

- Cloudflare 账号
- Wrangler CLI

### 部署步骤

1. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```

2. 登录 Cloudflare：
   ```bash
   wrangler login
   ```

3. 创建 KV 命名空间：
   ```bash
   # 创建数据存储命名空间
   wrangler kv:namespace create "NAVIGATION_DATA"
   
   # 创建会话存储命名空间
   wrangler kv:namespace create "NAVIGATION_SESSIONS"
   ```

4. 更新 `wrangler.toml` 配置：
   
   将创建的 KV 命名空间 ID 填入配置文件：
   ```toml
   [[kv_namespaces]]
   binding = "NAVIGATION_DATA"
   id = "your_namespace_id_here"
   
   [[kv_namespaces]]
   binding = "NAVIGATION_SESSIONS"
   id = "your_session_namespace_id_here"
   ```

5. 部署到 Cloudflare Workers：
   ```bash
   wrangler deploy
   ```

6. 访问应用：
   - Wrangler 会输出部署后的 URL，如：`https://simpage-worker.your-subdomain.workers.dev`

### 自定义域名

在 Cloudflare Dashboard 中为 Worker 添加自定义域名：

1. 进入 Workers & Pages > 你的 Worker
2. 点击 "Custom Domains"
3. 添加你的域名

### 环境变量配置

在 `wrangler.toml` 中设置环境变量：

```toml
[env.production.vars]
DEFAULT_WEATHER_CITY = "上海"
```

### 注意事项

- Cloudflare Workers 有请求时间限制（CPU 时间）
- KV 存储有延迟（最终一致性）
- 免费计划每天有 10 万次请求限制

### 限制说明

由于 Cloudflare Workers 的限制，`worker.js` 中的密码哈希功能使用了简化的实现。在生产环境中，建议：

1. 使用更安全的密码哈希算法
2. 考虑使用 Cloudflare Access 进行身份验证
3. 定期更换管理员密码

---

## GitHub Pages 部署

纯静态部署，适合个人使用。

### 特点

- ✅ 完全免费
- ✅ 自动部署
- ✅ 支持自定义域名
- ⚠️ 需要手动编辑文件来修改内容
- ⚠️ 无后台管理界面（前端页面正常工作）

### 部署步骤

1. Fork 本仓库到你的 GitHub 账号

2. 在仓库设置中启用 GitHub Pages：
   - 进入 `Settings` > `Pages`
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`
   - Folder 选择 `/public`

3. 等待部署完成（通常 1-2 分钟）

4. 访问你的站点：
   - `https://<your-username>.github.io/<repo-name>/`

### 自定义内容

由于 GitHub Pages 只能托管静态文件，你需要手动编辑文件：

1. 编辑 `public/index.html` 修改页面标题
2. 修改 `public/styles.css` 自定义样式
3. 在 `public` 目录下的 JavaScript 文件中硬编码你的导航数据

**注意**：前端会尝试从 API 加载数据，如果失败会使用内置的默认数据。你可以修改 JavaScript 文件中的默认数据来自定义内容

### 自定义域名

1. 在 GitHub Pages 设置中添加自定义域名
2. 在你的 DNS 提供商处添加 CNAME 记录指向 `<your-username>.github.io`

### GitHub Pages 限制

- 页面只能访问静态文件（HTML/CSS/JS）
- 后台功能使用 localStorage 实现
- 数据不会在多个设备间同步
- 清除浏览器数据会丢失所有配置
- 后台密码为明文存储在 localStorage（仅用于个人使用）

### 推荐使用场景

GitHub Pages 部署适合：
- 个人导航页
- 单设备使用
- 不需要数据同步
- 想要完全免费的解决方案

如果需要多设备同步或更强的安全性，建议使用 Node.js、Docker 或 Cloudflare Workers 部署方案。

### 数据管理

GitHub Pages 版本的数据存储在浏览器的 localStorage 中：

**导出数据**：
```javascript
// 在浏览器控制台执行
const data = localStorage.getItem('simpage_data');
console.log(data);
// 复制输出的 JSON 数据进行备份
```

**导入数据**：
```javascript
// 在浏览器控制台执行
const data = '...'; // 粘贴你的备份数据
localStorage.setItem('simpage_data', data);
location.reload();
```

**重置数据**：
```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

---

## 选择合适的部署方式

| 部署方式 | 难度 | 费用 | 数据持久化 | 性能 | 推荐场景 |
|---------|------|------|-----------|------|---------|
| Node.js | ⭐⭐ | 💰💰 | ✅ 文件 | ⭐⭐⭐ | 有 VPS 的用户 |
| Docker | ⭐ | 💰💰 | ✅ 数据卷 | ⭐⭐⭐ | 喜欢容器化的用户 |
| Cloudflare Workers | ⭐⭐⭐ | 💰 免费层 | ✅ KV 存储 | ⭐⭐⭐⭐⭐ | 追求高性能和全球访问 |
| GitHub Pages | ⭐ | 💰 完全免费 | ⚠️ localStorage | ⭐⭐ | 个人使用，单设备 |

### 推荐方案

- **个人使用**：GitHub Pages（免费且简单）
- **小型团队**：Docker Compose（易于管理和备份）
- **高流量场景**：Cloudflare Workers（全球 CDN + 边缘计算）
- **已有服务器**：Node.js + PM2（传统稳定）

---

## 环境变量

所有部署方式都支持以下环境变量：

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `DEFAULT_WEATHER_CITY` | 默认天气城市 | `北京` |

---

## 安全建议

1. **修改默认密码**：首次部署后立即修改管理员密码（默认：`admin123`）
2. **使用 HTTPS**：生产环境务必启用 HTTPS
3. **定期备份**：定期备份 `data/navigation.json` 文件
4. **限制访问**：可通过 Nginx 或防火墙限制后台访问

---

## 故障排查

### Node.js/Docker 部署问题

**问题：端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3000
# 或使用其他端口
PORT=3001 npm start
```

**问题：数据文件权限错误**
```bash
chmod 644 data/navigation.json
```

### Cloudflare Workers 问题

**问题：KV 写入失败**
- 检查 KV 命名空间 ID 是否正确
- 确认 Worker 有 KV 写入权限

**问题：超出 CPU 限制**
- 优化代码或升级到付费计划

### GitHub Pages 问题

**问题：页面 404**
- 确认 GitHub Actions 成功完成
- 检查 Pages 设置是否启用
- 确认 Source 选择了 "GitHub Actions"

**问题：数据丢失**
- GitHub Pages 使用 localStorage，清除浏览器数据会丢失所有配置
- 建议定期导出数据备份

---

## 更新部署

### Node.js / Docker
```bash
git pull
npm install  # Node.js
docker compose build && docker compose up -d  # Docker
```

### Cloudflare Workers
```bash
git pull
wrangler deploy
```

### GitHub Pages
```bash
git pull
git push origin main
```

---

## 获取帮助

如有问题，请提交 Issue 或参考项目文档。
