# Cloudflare Workers 部署指南（Windows 官方流程）

本文档详细介绍如何在 **Windows 系统**上使用 **Cloudflare 官方推荐的方法**将 SimPage 部署到 Cloudflare Workers。

> 🎯 **适合人群**：Windows 10/11 用户，无需服务器，想快速部署到全球 CDN

## 为什么选择 Cloudflare Workers？

- ⚡ **全球加速**：部署在 Cloudflare 的全球边缘网络，访问速度极快
- 🚀 **自动扩容**：根据流量自动扩展，无需担心性能问题
- 💰 **免费额度**：每天 10 万次请求免费
- 🔒 **安全可靠**：Cloudflare 提供 DDoS 防护和 SSL 证书
- 🛠️ **零运维**：无需管理服务器，专注于应用本身

## 快速开始（5 分钟部署）

如果你熟悉命令行操作，可以快速部署：

```powershell
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 克隆项目
git clone <项目地址>
cd simpage

# 4. 创建 KV 命名空间（记录输出的 ID）
wrangler kv:namespace create "NAVIGATION_DATA"
wrangler kv:namespace create "NAVIGATION_SESSIONS"

# 5. 编辑 wrangler.toml，填入 KV 命名空间 ID

# 6. 部署
wrangler deploy
```

如果你是新手或想了解每一步的详细说明，请继续阅读下面的完整指南。

---

## 目录

- [前置要求](#前置要求)
- [Windows 环境准备](#windows-环境准备)
- [部署步骤](#部署步骤)
- [自定义域名](#自定义域名)
- [数据管理](#数据管理)
- [故障排查](#故障排查)
- [安全加固](#安全加固)
- [最佳实践](#最佳实践)

---

## 前置要求

1. **Cloudflare 账号**（免费注册：https://dash.cloudflare.com/sign-up）
2. **Windows 10/11 系统**
3. **Node.js 18+**（从 https://nodejs.org 下载并安装 LTS 版本）

## Windows 环境准备

### 安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载并安装 LTS 版本（推荐 18.x 或更高版本）
3. 安装时选择"自动安装必要的工具"选项

### 验证安装

打开 **Windows PowerShell** 或 **命令提示符**，运行以下命令验证：

```powershell
node --version
npm --version
```

如果显示版本号，说明安装成功。

### PowerShell 执行策略（可选）

如果遇到脚本执行权限问题，以管理员身份运行 PowerShell 并执行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 部署步骤

### 1. 安装 Wrangler CLI

打开 **Windows PowerShell** 或 **命令提示符**，运行：

```powershell
npm install -g wrangler
```

安装完成后验证：

```powershell
wrangler --version
```

若安装出现问题，可参考 Cloudflare 官方 Windows 指南：[Install Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)。

### 2. 登录 Cloudflare

在 PowerShell 中运行：

```powershell
wrangler login
```

这会自动打开浏览器进行授权：
1. 在浏览器中登录你的 Cloudflare 账号
2. 点击"允许"授权 Wrangler 访问你的账号
3. 看到"登录成功"提示后，返回 PowerShell 继续操作

### 3. 下载项目代码

在 PowerShell 中进入你想存放项目的目录，然后克隆项目：

```powershell
cd C:\Users\你的用户名\Documents
git clone <项目地址>
cd simpage
```

如果没有安装 Git，可以从 GitHub 直接下载 ZIP 文件并解压。

### 4. 创建 KV 命名空间

SimPage 使用 Cloudflare KV 存储数据。在项目目录中运行以下命令创建两个 KV 命名空间：

```powershell
# 创建数据存储命名空间
wrangler kv:namespace create "NAVIGATION_DATA"
```

命令会输出类似以下内容：

```
🌀 Creating namespace with title "simpage-worker-NAVIGATION_DATA"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "NAVIGATION_DATA", id = "abc123xyz456" }
```

**重要**：记录下输出的 ID（例如 `abc123xyz456`），稍后需要用到。

继续创建第二个命名空间：

```powershell
# 创建会话存储命名空间
wrangler kv:namespace create "NAVIGATION_SESSIONS"
```

同样记录下这个命名空间的 ID。

### 5. 配置 wrangler.toml

使用文本编辑器（如记事本、VS Code 或 Notepad++）打开项目目录中的 `wrangler.toml` 文件。

找到 `[[kv_namespaces]]` 部分，将 `id` 替换为上一步获得的实际 ID：

```toml
name = "simpage-worker"
main = "worker.js"
compatibility_date = "2024-01-01"

# 替换为你的 KV 命名空间 ID
[[kv_namespaces]]
binding = "NAVIGATION_DATA"
id = "abc123xyz456"  # 替换为你的 NAVIGATION_DATA 的实际 ID

[[kv_namespaces]]
binding = "NAVIGATION_SESSIONS"
id = "def456ghi789"  # 替换为你的 NAVIGATION_SESSIONS 的实际 ID

[env.production.vars]
DEFAULT_WEATHER_CITY = "北京"

[site]
bucket = "./public"
```

保存文件。

### 6. 部署到 Cloudflare Workers

在 PowerShell 中确认你在项目目录下，然后运行：

```powershell
wrangler deploy
```

部署过程需要几秒到几十秒，成功后会输出访问 URL：

```
✨ Success! Uploaded 1 files (2.34 sec)
Published simpage-worker (1.23 sec)
  https://simpage-worker.你的账号.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 7. 访问应用

复制输出的 URL，在浏览器中打开：

- **前台导航页**：`https://simpage-worker.你的账号.workers.dev/`
- **后台管理页**：`https://simpage-worker.你的账号.workers.dev/admin`

**首次登录信息**：
- 用户名：admin
- 默认密码：`admin123`

⚠️ **重要**：登录后请立即在后台修改密码！

## 自定义域名

如果你有自己的域名，可以为 Worker 添加自定义域名：

### 方法一：通过 Cloudflare Dashboard

1. 进入 Cloudflare Dashboard
2. 选择 `Workers & Pages` > 你的 Worker
3. 点击 `Custom Domains` 标签
4. 点击 `Add Custom Domain`
5. 输入你的域名或子域名（如 `nav.example.com`）
6. 点击 `Add Custom Domain`

Cloudflare 会自动配置 DNS 记录和 SSL 证书。

### 方法二：通过 wrangler.toml 配置

在 `wrangler.toml` 中添加路由配置：

```toml
routes = [
  { pattern = "nav.example.com/*", zone_name = "example.com" }
]
```

然后重新部署：

```powershell
wrangler deploy
```

## 环境变量配置

在 `wrangler.toml` 中可以配置环境变量：

```toml
[env.production.vars]
DEFAULT_WEATHER_CITY = "上海"  # 默认天气城市
```

## 数据管理

### 查看 KV 数据

在 PowerShell 中运行以下命令：

```powershell
# 列出所有键
wrangler kv:key list --namespace-id=你的NAVIGATION_DATA的ID

# 读取特定键的值
wrangler kv:key get "navigation" --namespace-id=你的NAVIGATION_DATA的ID
```

### 备份数据

```powershell
# 导出数据到文件
wrangler kv:key get "navigation" --namespace-id=你的NAVIGATION_DATA的ID > backup.json
```

备份文件会保存在当前目录下。

### 恢复数据

```powershell
# 从文件导入数据
wrangler kv:key put "navigation" --path=backup.json --namespace-id=你的NAVIGATION_DATA的ID
```

### 清空数据

```powershell
# 删除导航数据（会恢复为默认配置）
wrangler kv:key delete "navigation" --namespace-id=你的NAVIGATION_DATA的ID
```

## 更新部署

当代码更新后，在 PowerShell 中重新部署即可：

```powershell
git pull  # 如果使用 Git
wrangler deploy
```

Cloudflare Workers 会自动在全球所有节点更新你的应用。

## 监控和日志

### 查看实时日志

在 PowerShell 中运行：

```powershell
wrangler tail
```

这会显示 Worker 的实时运行日志。按 `Ctrl+C` 停止监控。

### 查看分析数据

1. 进入 Cloudflare Dashboard
2. 选择 `Workers & Pages` > 你的 Worker
3. 查看 `Analytics` 标签

可以看到：
- 请求次数
- 响应时间
- 错误率
- 流量统计

## 性能优化

### 1. 启用缓存

Worker 已经部署在 CDN 上，静态资源会自动缓存。

### 2. 压缩响应

Cloudflare 会自动压缩响应内容（Gzip/Brotli）。

### 3. HTTP/3 支持

Cloudflare 自动支持 HTTP/3，提供更快的连接速度。

## 费用说明

### 免费计划

- 每天 10 万次请求
- 包含 KV 读取和写入
- 适合个人使用或小型项目

### 付费计划

如果超出免费额度，Workers Paid 计划为：
- $5/月 基础费用
- 超出部分：$0.50 / 百万次请求
- KV 存储：$0.50 / GB·月

对于大多数个人导航页，免费计划完全足够。

## 限制和注意事项

### Workers 限制

- **CPU 时间限制**：每次请求最多 50ms CPU 时间（免费）/ 50ms（付费）
- **内存限制**：128 MB
- **响应大小**：无限制

### KV 限制

- **键大小**：最大 512 字节
- **值大小**：最大 25 MB
- **一致性**：最终一致性（全球同步可能需要 60 秒）

### 密码安全

由于 Cloudflare Workers 的限制，`worker.js` 中使用了简化的密码哈希实现。

**生产环境建议**：
1. 使用强密码
2. 定期更换密码
3. 限制后台访问 IP（通过 Cloudflare Access）
4. 启用两步验证（通过 Cloudflare Access）

### Web Crypto API

Worker 使用 Web Crypto API 进行密码哈希（SHA-256），这比 Node.js 的 scrypt 更简单，但对于导航页应用已经足够安全。

## 故障排查

### Windows 常见问题

#### 问题：PowerShell 脚本执行权限错误

**错误信息**：
```
wrangler : 无法加载文件 C:\Users\...\wrangler.ps1，因为在此系统上禁止运行脚本。
```

**解决方法**：
以管理员身份运行 PowerShell，然后执行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 问题：npm 安装 Wrangler 失败

**解决方法**：
1. 确认 Node.js 已正确安装：`node --version`
2. 清理 npm 缓存：`npm cache clean --force`
3. 重新安装：`npm install -g wrangler`
4. 如果网络较慢，可以使用淘宝镜像：
   ```powershell
   npm config set registry https://registry.npmmirror.com
   npm install -g wrangler
   ```

#### 问题：找不到 wrangler 命令

**解决方法**：
1. 关闭并重新打开 PowerShell
2. 检查环境变量是否包含 npm 全局安装路径
3. 手动添加路径到系统环境变量（通常是 `C:\Users\你的用户名\AppData\Roaming\npm`）

### 部署相关问题

#### 问题：部署失败

**解决方法**：
1. 检查 `wrangler.toml` 配置是否正确
2. 确认 KV 命名空间 ID 是否正确（必须是实际创建的 ID）
3. 在 PowerShell 运行 `wrangler whoami` 确认已登录
4. 查看错误信息中的具体原因

#### 问题：数据无法保存

**解决方法**：
1. 检查 KV 命名空间是否正确配置
2. 查看 Worker 日志：`wrangler tail`
3. 确认 Worker 有 KV 写入权限
4. 确认 `wrangler.toml` 中的 binding 名称正确

#### 问题：后台登录失败

**解决方法**：
1. 首次部署后，使用默认密码 `admin123`
2. 如果忘记密码，在 PowerShell 中运行以下命令删除 KV 数据，会重置为默认配置：
   ```powershell
   wrangler kv:key delete "navigation" --namespace-id=你的NAVIGATION_DATA的ID
   ```

#### 问题：天气获取失败

**解决方法**：
1. 检查城市名称是否正确（支持中文和英文）
2. Open-Meteo API 可能暂时不可用，稍后重试
3. 在 PowerShell 运行 `wrangler tail` 查看日志确认具体错误

#### 问题：超出免费额度

**解决方法**：
1. 在 Cloudflare Dashboard 查看实际使用量
2. 考虑升级到 Workers Paid 计划（$5/月）
3. 优化代码减少不必要的请求

## 安全加固

### 1. 限制后台访问

使用 Cloudflare Access 限制后台页面访问：

```toml
# 在 wrangler.toml 中添加
[[routes]]
pattern = "*/admin*"
zone_name = "example.com"
```

然后在 Cloudflare Dashboard 中配置 Access 策略。

### 2. 启用 WAF

在 Cloudflare Dashboard 中启用 Web Application Firewall：

1. 进入 `Security` > `WAF`
2. 启用预设的安全规则
3. 根据需要自定义规则

### 3. 速率限制

可以在 Worker 代码中添加速率限制逻辑，或使用 Cloudflare 的 Rate Limiting 功能。

## 从其他部署方式迁移

### 从 Node.js / Docker 迁移

1. 导出现有数据：
   ```bash
   cat data/navigation.json > backup.json
   ```

2. 部署 Worker

3. 导入数据：
   ```bash
   wrangler kv:key put "navigation" --path=backup.json --namespace-id=你的ID
   ```

## 最佳实践

1. **定期备份**：定期备份 KV 数据
2. **监控使用量**：关注请求量，避免超出免费额度
3. **使用自定义域名**：更专业的访问体验
4. **启用 Cloudflare Analytics**：了解用户访问情况
5. **设置告警**：在 Cloudflare 中设置使用量告警

## 相关资源

- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Workers 定价](https://developers.cloudflare.com/workers/platform/pricing/)

## 获取帮助

如有问题，请：
1. 查看本文档的故障排查部分
2. 阅读 Cloudflare Workers 官方文档
3. 在 GitHub 仓库提交 Issue
