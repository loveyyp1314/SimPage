# 现代化导航页

一个集成时间问候、天气信息、智能搜索，以及应用与书签快捷入口的现代化导航页示例。项目提供后台编辑页面，并将数据持久化在本地文件中，便于轻量快速地部署和管理。

## 功能特性

- **概览区域**：展示当前时间、日期、问候语及实时天气信息，并提供全局搜索入口。
- **应用与书签分区**：两大模块采用自适应 4-5 列网格排布，支持自由缩放，卡片包含图标、名称与描述信息。
- **后台编辑页面**：无需额外数据库，通过后台页面即可新增、修改或删除应用与书签条目。
- **文件化存储**：导航数据保存在 `data/navigation.json` 文件中，便于备份、版本控制与离线修改。
- **响应式与毛玻璃视觉**：延续灰白极简风格与毛玻璃效果，在桌面与移动端均有优秀的浏览体验。

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
   - 后台编辑页：[`http://localhost:3000/admin.html`](http://localhost:3000/admin.html)

> 天气信息通过 [open-meteo](https://open-meteo.com/) 公共接口获取，默认定位北京，可在浏览器授权后使用当前定位。

## 数据管理

- 导航数据位于 `data/navigation.json`，结构示例：
  ```json
  {
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
        "icon": "🌐"
      }
    ]
  }
  ```
- 可直接通过后台页面完成增删改操作并保存；服务端会自动为缺失的条目生成唯一 `id`，并确保链接包含协议头。

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

## 自定义与部署

- 可在 `navigation.json` 中预先填充企业或个人常用的应用与书签。
- 部署时，将整个项目放置于 Node.js 运行环境，执行 `npm install && npm start` 即可对外提供服务。

祝使用愉快！
