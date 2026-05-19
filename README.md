# Seedance Platform

基于火山引擎 Seedance 2.0 API 的视频生成控制台，通过 Web 页面操作即可完成视频生成、任务查询等全流程。

## 技术栈

- **前端**: Vite + React 19
- **后端**: Express (Node.js)
- **API**: 火山引擎 Ark Seedance 2.0

## 功能

- 🎬 **创建视频生成任务** — 支持文生视频、图生视频、多模态参考生视频
- 📋 **任务列表** — 实时查看所有任务状态（排队中 / 运行中 / 已完成 / 失败）
- 🔄 **状态轮询** — 提交任务后自动轮询直到完成
- 🖼️ **本地文件上传** — 图片支持点击、拖拽、Ctrl+V 粘贴；视频和音频支持本地选择
- 🎛️ **完整参数配置** — 模型选择、分辨率、宽高比、时长、种子、水印、音频生成等
- 🧠 **智能参数校验** — 2.0 系列自动禁用不支持的离线推理和 service_tier 参数

## 快速开始

### 前置条件

- Node.js >= 18
- 火山引擎 Ark API Key（需开通 Seedance 2.0 模型权限）

### 安装

```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 配置

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入你的 API Key：

```
ARK_API_KEY=your-api-key-here
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/plan/v3
PORT=3001
```

### 启动

```bash
# 终端 1 — 启动后端（端口 3001）
cd server && npm start

# 终端 2 — 启动前端（端口 5173）
cd client && npm run dev
```

打开 http://localhost:5173 即可使用。

## 项目结构

```
seedance_platform/
├── server/                  # 后端
│   ├── index.js             # Express 服务，代理 Seedance API
│   ├── .env.example         # 环境变量模板
│   └── package.json
├── client/                  # 前端
│   ├── src/
│   │   ├── App.jsx          # 主应用（创建任务 + 任务列表）
│   │   ├── App.css          # 样式
│   │   ├── index.css        # 全局样式
│   │   └── main.jsx         # 入口
│   ├── vite.config.js       # Vite 配置（含 API 代理）
│   └── package.json
└── .gitignore
```

## API 接口

后端代理以下火山引擎 Ark API：

| 操作 | 方法 | 路径 |
|------|------|------|
| 创建任务 | POST | `/api/tasks` |
| 查询任务列表 | GET | `/api/tasks` |
| 查询单个任务 | GET | `/api/tasks/:id` |
| 取消/删除任务 | DELETE | `/api/tasks/:id` |

认证方式：`Authorization: Bearer $ARK_API_KEY`