# Cloudflare Workers 部署指南

本文档详细介绍如何将 SimPage 部署到 Cloudflare Workers。

## 为什么选择 Cloudflare Workers？

- ⚡ **全球加速**：部署在 Cloudflare 的全球边缘网络，访问速度极快
- 🚀 **自动扩容**：根据流量自动扩展，无需担心性能问题
- 💰 **免费额度**：每天 10 万次请求免费
- 🔒 **安全可靠**：Cloudflare 提供 DDoS 防护和 SSL 证书
- 🛠️ **零运维**：无需管理服务器，专注于应用本身

## 前置要求

1. Cloudflare 账号（免费注册：https://dash.cloudflare.com/sign-up）
2. Node.js 18+ 和 npm
3. Wrangler CLI 工具

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器进行授权，完成后返回终端继续操作。

### 3. 创建 KV 命名空间

SimPage 使用 Cloudflare KV 存储数据。需要创建两个 KV 命名空间：

```bash
# 创建数据存储命名空间
wrangler kv:namespace create "NAVIGATION_DATA"

# 创建会话存储命名空间
wrangler kv:namespace create "NAVIGATION_SESSIONS"
```

命令会输出类似以下内容：

```
🌀 Creating namespace with title "simpage-worker-NAVIGATION_DATA"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "NAVIGATION_DATA", id = "abc123xyz456" }
```

记录下这两个命名空间的 ID。

### 4. 配置 wrangler.toml

编辑 `wrangler.toml` 文件，将 KV 命名空间 ID 替换为上一步获得的 ID：

```toml
name = "simpage-worker"
main = "worker.js"
compatibility_date = "2024-01-01"

# 替换为你的 KV 命名空间 ID
[[kv_namespaces]]
binding = "NAVIGATION_DATA"
id = "替换为你的NAVIGATION_DATA的ID"

[[kv_namespaces]]
binding = "NAVIGATION_SESSIONS"
id = "替换为你的NAVIGATION_SESSIONS的ID"

[env.production.vars]
DEFAULT_WEATHER_CITY = "北京"

[site]
bucket = "./public"
```

### 5. 部署到 Cloudflare Workers

```bash
wrangler deploy
```

部署成功后，Wrangler 会输出访问 URL：

```
✨ Success! Uploaded 1 files (X.XX sec)
Published simpage-worker (X.XX sec)
  https://simpage-worker.your-subdomain.workers.dev
```

### 6. 访问应用

打开浏览器访问输出的 URL：

- 前台导航页：`https://simpage-worker.your-subdomain.workers.dev/`
- 后台管理页：`https://simpage-worker.your-subdomain.workers.dev/admin`

默认管理员密码：`admin123`（请在首次登录后立即修改）

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

```bash
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

```bash
# 列出所有键
wrangler kv:key list --namespace-id=你的NAVIGATION_DATA的ID

# 读取特定键的值
wrangler kv:key get "navigation" --namespace-id=你的NAVIGATION_DATA的ID
```

### 备份数据

```bash
# 导出数据到文件
wrangler kv:key get "navigation" --namespace-id=你的NAVIGATION_DATA的ID > backup.json
```

### 恢复数据

```bash
# 从文件导入数据
wrangler kv:key put "navigation" --path=backup.json --namespace-id=你的NAVIGATION_DATA的ID
```

### 清空数据

```bash
# 删除导航数据（会恢复为默认配置）
wrangler kv:key delete "navigation" --namespace-id=你的NAVIGATION_DATA的ID
```

## 更新部署

当代码更新后，重新部署即可：

```bash
git pull  # 如果使用 Git
wrangler deploy
```

Cloudflare Workers 会自动在全球所有节点更新你的应用。

## 监控和日志

### 查看实时日志

```bash
wrangler tail
```

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

### 问题：部署失败

**解决方法**：
1. 检查 `wrangler.toml` 配置是否正确
2. 确认 KV 命名空间 ID 是否正确
3. 运行 `wrangler whoami` 确认已登录
4. 查看错误信息中的具体原因

### 问题：数据无法保存

**解决方法**：
1. 检查 KV 命名空间是否正确配置
2. 查看 Worker 日志：`wrangler tail`
3. 确认 Worker 有 KV 写入权限

### 问题：登录失败

**解决方法**：
1. 首次部署后，使用默认密码 `admin123`
2. 如果忘记密码，可以删除 KV 中的 `navigation` 键，数据会重置

### 问题：天气获取失败

**解决方法**：
1. 检查城市名称是否正确
2. Open-Meteo API 可能暂时不可用，稍后重试
3. 查看 Worker 日志确认具体错误

### 问题：超出免费额度

**解决方法**：
1. 在 Cloudflare Dashboard 查看实际使用量
2. 考虑升级到 Workers Paid 计划
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

### 从 GitHub Pages 迁移

由于 GitHub Pages 数据存储在 localStorage，需要：

1. 在浏览器控制台导出数据：
   ```javascript
   const data = localStorage.getItem('simpage_data');
   console.log(data);
   ```

2. 将数据保存为 JSON 文件

3. 导入到 Worker KV：
   ```bash
   wrangler kv:key put "navigation" --path=data.json --namespace-id=你的ID
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
