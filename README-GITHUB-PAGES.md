# GitHub Pages 部署指南

本文档详细介绍如何将 SimPage 部署到 GitHub Pages，实现完全免费的静态托管。

## ⚠️ 重要提示

GitHub Pages 只能托管静态网站（HTML/CSS/JavaScript），**不支持后端服务**。因此：

- ✅ 前台导航功能完全正常
- ✅ 静态内容展示
- ✅ 自定义域名支持
- ✅ **支持后台编辑功能（通过 GitHub Actions）** ⭐️ 新功能
- ✅ **支持多设备数据同步（通过 Git）**
- ⚠️ 访客计数等动态功能不可用
- ⚠️ 数据保存需要 1-2 分钟延迟

## 适用场景

GitHub Pages 部署适合：
- 个人导航页，完全免费托管
- 多设备数据同步（通过 Git）
- 想要完全免费的解决方案
- **支持后台编辑功能（通过 GitHub Actions）** ⭐️

## 不适合的场景

如果你需要以下功能，请使用 [Node.js / Docker](./README.md) 或 [Cloudflare Workers](./README-CLOUDFLARE.md) 部署：
- 即时数据保存（GitHub Pages 有 1-2 分钟延迟）
- 访客统计功能
- 团队协作管理（多人同时编辑）

## 部署步骤

### 方法一：通过 GitHub 仓库设置部署（推荐）

这是最简单的部署方式，无需编写任何代码。

#### 1. Fork 本仓库

1. 访问本项目的 GitHub 仓库
2. 点击右上角的 `Fork` 按钮
3. 选择你的账号，创建 Fork

#### 2. 启用 GitHub Pages

1. 进入你 Fork 的仓库
2. 点击 `Settings`（设置）
3. 在左侧菜单找到 `Pages`
4. 在 `Source` 下拉菜单中选择 `Deploy from a branch`
5. 在 `Branch` 下拉菜单中：
   - 选择 `main` 分支
   - 选择 `/public` 目录
6. 点击 `Save`

#### 3. 等待部署完成

GitHub 会自动部署你的站点，通常需要 1-2 分钟。

#### 4. 访问你的站点

部署完成后，访问：
```
https://<你的GitHub用户名>.github.io/<仓库名>/
```

例如，如果你的用户名是 `zhangsan`，仓库名是 `simpage`，访问地址就是：
```
https://zhangsan.github.io/simpage/
```

### 方法二：通过 GitHub Actions 自动部署

如果你想要更灵活的部署控制，可以使用 GitHub Actions。

#### 1. Fork 仓库（同方法一）

#### 2. 启用 GitHub Pages

1. 进入仓库 `Settings` > `Pages`
2. 在 `Source` 下拉菜单中选择 `GitHub Actions`

#### 3. 创建 GitHub Actions 工作流

在你的仓库中创建文件 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 4. 提交并推送

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deployment workflow"
git push
```

GitHub Actions 会自动运行，将 `public` 目录部署到 GitHub Pages。

## 启用后台编辑（GitHub Actions）

1. **确认 workflow 文件存在**：仓库需要包含 `.github/workflows/update-navigation-data.yml`（已在本仓库提供）。
2. **创建 Personal Access Token**：在 [GitHub Token 页面](https://github.com/settings/tokens/new?scopes=repo,workflow&description=SimPage%20Admin) 生成一个拥有 `repo` 与 `workflow` 权限的 Token。
3. **打开后台管理页**：访问 `https://<你的站点>/admin.html`，在弹出的 “GitHub Actions 模式配置” 卡片中填写：
   - 仓库所有者（Owner）
   - 仓库名称（Repository）
   - 分支（默认为 `main`）
   - Personal Access Token
4. **点击“保存并验证配置”**：前端会自动校验配置并触发一次数据加载。
5. **开始编辑**：编辑完成后点击 “保存修改”，前端会触发 workflow，数据将在 1-2 分钟后写入仓库并自动部署。

> **安全性说明**：Token 仅保存在浏览器本地 `localStorage` 中，不会发送到任何第三方服务器。GitHub Actions 会将数据提交到仓库，可通过 Git 历史随时回滚。

## 自定义内容

由于 GitHub Pages 没有后台编辑功能，你需要手动编辑文件来自定义内容。

### 修改站点信息

编辑 `public/index.html` 文件：

```html
<!-- 修改站点名称 -->
<title>你的导航页名称</title>

<!-- 修改页面标题 -->
<h1 id="site-name">你的导航页名称</h1>
```

### 添加应用和书签

1. 打开 `public/data/navigation.json`（如果不存在则创建）
2. 编辑 JSON 文件添加内容：

```json
{
  "settings": {
    "siteName": "我的导航页",
    "siteLogo": "🚀",
    "greeting": "欢迎使用",
    "footer": "© 2024 我的导航页"
  },
  "apps": [
    {
      "id": "app-1",
      "name": "GitHub",
      "url": "https://github.com",
      "description": "代码托管平台",
      "icon": "🐙"
    }
  ],
  "bookmarks": [
    {
      "id": "bookmark-1",
      "name": "Google",
      "url": "https://google.com",
      "description": "搜索引擎",
      "icon": "🔍",
      "category": "工具"
    }
  ]
}
```

3. 提交并推送更改：

```bash
git add public/data/navigation.json
git commit -m "Update navigation data"
git push
```

GitHub Pages 会自动更新你的站点。

### 修改样式

编辑 `public/styles.css` 来自定义外观。

## 自定义域名

### 前置要求

- 拥有一个域名
- 能够管理域名的 DNS 设置

### 配置步骤

#### 1. 在 GitHub 配置自定义域名

1. 进入仓库 `Settings` > `Pages`
2. 在 `Custom domain` 输入框中输入你的域名
3. 点击 `Save`

#### 2. 配置 DNS

根据你想使用的域名类型，选择对应的配置方式：

**使用根域名（如 `example.com`）：**

在你的 DNS 提供商添加以下 A 记录：

```
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153
```

**使用子域名（如 `nav.example.com`）：**

添加 CNAME 记录：

```
CNAME    nav    <你的GitHub用户名>.github.io
```

#### 3. 启用 HTTPS

GitHub Pages 会自动为你的自定义域名签发免费的 SSL 证书（Let's Encrypt）。

在 `Settings` > `Pages` 中勾选 `Enforce HTTPS`。

DNS 生效后（可能需要几分钟到几小时），你就可以通过自定义域名访问了。

## 数据管理

### ⚠️ 数据存储方式

GitHub Pages 部署的应用，所有数据都存储在**浏览器的 localStorage** 中，不会同步到服务器。

这意味着：
- 更换浏览器、清除缓存会丢失所有数据
- 不同设备之间无法同步数据
- 隐私模式下的修改不会保存

### 手动备份数据

如果你在浏览器中修改了配置（虽然没有后台功能，但可能通过控制台），可以这样备份：

1. 打开浏览器开发者工具（F12）
2. 进入 Console 标签
3. 输入以下命令查看数据：

```javascript
// 查看所有 localStorage 数据
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('simpage_')) {
    console.log(key, localStorage.getItem(key));
  }
}
```

### 手动恢复数据

如果需要恢复数据：

```javascript
// 在浏览器控制台执行
localStorage.setItem('simpage_data', '你的备份数据JSON字符串');
location.reload();
```

## 更新部署

### 更新内容

1. 修改 `public` 目录下的文件
2. 提交并推送：

```bash
git add .
git commit -m "Update content"
git push
```

GitHub Pages 会自动重新部署，通常需要 1-2 分钟。

### 同步上游更新

如果原仓库有更新，你可以同步：

#### 方法一：通过 GitHub Web 界面

1. 进入你 Fork 的仓库
2. 点击 `Sync fork` 按钮
3. 点击 `Update branch`

#### 方法二：通过命令行

```bash
# 添加上游仓库
git remote add upstream <原仓库URL>

# 拉取上游更新
git fetch upstream

# 合并到你的分支
git merge upstream/main

# 推送更新
git push
```

## 性能优化

### 1. 图片优化

将图片放在 `public` 目录下，GitHub Pages 会自动提供 CDN 加速。

建议：
- 使用 WebP 格式
- 压缩图片大小
- 使用适当的尺寸

### 2. 启用缓存

GitHub Pages 会自动为静态资源设置缓存头。

### 3. 减少文件大小

- 压缩 CSS 和 JavaScript
- 删除未使用的代码
- 使用精简的图标（emoji 或 SVG）

## 限制说明

### GitHub Pages 限制

- **仓库大小**：建议小于 1 GB
- **带宽**：每月 100 GB
- **构建次数**：每小时 10 次
- **文件大小**：单个文件最大 100 MB

这些限制对于导航页来说绰绰有余。

### 功能限制

| 功能 | 是否支持 |
|-----|---------|
| 静态页面展示 | ✅ |
| 自定义样式 | ✅ |
| 自定义域名 | ✅ |
| HTTPS | ✅ |
| 后台编辑 | ❌ |
| 数据同步 | ❌ |
| 访客统计 | ❌ |
| 天气 API | ⚠️ 受浏览器 CORS 限制 |

## 故障排查

### 问题：404 错误

**可能原因**：
1. Pages 未启用
2. 分支或目录设置错误
3. 文件路径大小写问题

**解决方法**：
1. 检查 `Settings` > `Pages` 设置
2. 确认选择了正确的分支和目录
3. GitHub Pages 区分大小写，检查文件名

### 问题：样式丢失

**可能原因**：资源路径不正确

**解决方法**：
使用相对路径或绝对路径：

```html
<!-- 相对路径 -->
<link rel="stylesheet" href="./styles.css">

<!-- 绝对路径（推荐） -->
<link rel="stylesheet" href="/仓库名/styles.css">
```

### 问题：更新不生效

**可能原因**：浏览器缓存

**解决方法**：
1. 强制刷新：Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)
2. 清除浏览器缓存
3. 等待几分钟让 GitHub Pages 完成部署

### 问题：天气功能不工作

**说明**：GitHub Pages 部署的静态页面，天气 API 请求可能受到 CORS 限制。

**解决方法**：
1. 使用支持 CORS 的天气 API
2. 或者移除天气功能
3. 考虑使用有后端的部署方式

### 问题：自定义域名无法访问

**解决方法**：
1. 检查 DNS 配置是否正确
2. 等待 DNS 生效（可能需要 24-48 小时）
3. 使用 `dig` 或 `nslookup` 命令检查 DNS 解析：
   ```bash
   dig your-domain.com
   ```

## 从其他部署方式迁移

### 从 Node.js / Docker 迁移

1. 导出 `data/navigation.json` 文件
2. 将其放到 `public/data/navigation.json`
3. 提交并推送

注意：迁移后将失去后台编辑功能。

### 迁移到 Node.js / Docker / Cloudflare Workers

如果你发现 GitHub Pages 的限制太多，想要迁移到有后端的方案：

1. Clone 完整的仓库
2. 手动创建 `data/navigation.json` 文件，填入你的数据
3. 按照相应的部署文档进行部署

## 最佳实践

1. **定期备份**：将你的修改提交到 Git 仓库
2. **使用分支**：在 `dev` 分支开发，测试无误后合并到 `main`
3. **文档化**：在 README 中记录你的自定义内容
4. **版本控制**：使用 Git tags 标记重要版本

## 相关资源

- [GitHub Pages 官方文档](https://docs.github.com/pages)
- [GitHub Pages 自定义域名](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [GitHub Actions 文档](https://docs.github.com/actions)

## 获取帮助

如有问题，请：
1. 查看本文档的故障排查部分
2. 阅读 GitHub Pages 官方文档
3. 在 GitHub 仓库提交 Issue

---

**提示**：如果你需要后台编辑、数据同步等功能，建议使用 [Cloudflare Workers](./README-CLOUDFLARE.md) 部署，同样免费且功能完整！
