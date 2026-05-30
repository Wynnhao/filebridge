<div align="center">

# 🌉 FileBridge

**一句话将 AI 生成的 Markdown / HTML 文档变成微信可分享链接**

*Turn your AI-generated Markdown/HTML docs into a shareable WeChat link in one command.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com)
[![Hono](https://img.shields.io/badge/Framework-Hono-E36002)](https://hono.dev)

[English](#english) · [中文](#中文)

</div>

---

## 中文

### 这是什么？

你用 AI 写了一篇文章、一份报告、一个方案，保存在本地是 `.md` 文件。  
你想分享给朋友，但微信不支持直接发 Markdown，截长图又丑又失去互动性。

**FileBridge** 解决这个问题：

```
你的 .md 文件
    ↓  上传到 FileBridge（一行命令）
Cloudflare 边缘服务器
    ├── 渲染成移动端 HTML（代码高亮、表格、目录）
    ├── 托管 7 天（自动过期）
    └── 返回链接 + 二维码
         ↓
把二维码发到微信  →  朋友扫码  →  手机直接阅读
```

**三个字：传 · 扫 · 读**

### 核心优势

| 对比项 | 截图/长图 | FileBridge |
|--------|-----------|------------|
| 代码块 | 图片，无法复制 | 可复制，有高亮 |
| 表格 | 变形/截断 | 完整渲染 |
| 手机适配 | 凑合 | 专为移动端优化 |
| 安装要求 | 接收方无需任何 | 接收方无需任何 ✅ |
| 文件大小 | 几 MB 图片 | 几 KB HTML |
| 接收门槛 | 保存图片 | 扫码即看 ✅ |

### 快速开始

#### 一、使用公共服务（最快，无需部署）

```bash
# 上传你的文档
curl -F "file=@README.md" https://filebridge.workers.dev/upload
```

> ⚠️ **注意**：公共服务为演示用途，不保证可用性。建议自部署（见下文），完全免费。

#### 二、在代码/脚本中调用

```typescript
import { bridgeFile } from './skill/src/index.ts'

const result = await bridgeFile('./README.md')
console.log('分享链接：', result.url)
// result.qrcode 是 SVG data URL，可在终端/浏览器/IDE 中显示
```

#### 三、在 AI IDE 中使用 Skill

将 `skill/` 目录注册为 CodeFlicker Skill 后，直接对话：

```
把这个文档分享出去
```

### 自部署（推荐，完全免费）

> **前置条件**：[Cloudflare 账号](https://cloudflare.com)（免费）+ Node.js 18+ 或 Bun

**Step 1：克隆并安装依赖**

```bash
git clone https://github.com/xuwenhao03/filebridge.git
cd filebridge/worker
npm install          # 或 bun install
```

**Step 2：登录 Cloudflare**

```bash
npx wrangler auth login
```

**Step 3：创建云端资源**

```bash
# 创建 R2 Bucket（存储渲染后的 HTML）
npx wrangler r2 bucket create filebridge-docs

# 创建 KV 命名空间（存储文档元数据 + 过期控制）
npx wrangler kv namespace create DOC_META
# ↑ 命令会输出类似：
# { binding: 'DOC_META', id: 'xxxxxxxxxx', preview_id: 'yyyyyyyyyy' }
# 复制这两个 ID
```

**Step 4：填入 KV ID**

编辑 `worker/wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "DOC_META"
id = "你的 id"           # ← 替换这里
preview_id = "你的 preview_id"  # ← 替换这里
```

**Step 5：本地测试**

```bash
cd worker
npx wrangler dev

# 另开终端测试
curl -F "file=@../README.md" http://localhost:8787/upload
```

成功的话会返回：
```json
{
  "id": "abc12345",
  "url": "http://localhost:8787/s/abc12345",
  "qrcode": "data:image/svg+xml;base64,...",
  "title": "FileBridge",
  "expires": "2026-06-07T..."
}
```

**Step 6：部署到 Cloudflare**

```bash
npx wrangler deploy
```

部署成功后会显示：
```
https://filebridge.<your-subdomain>.workers.dev
```

更新 `wrangler.toml` 中的 `BASE_URL` 为你的实际域名，然后再 `deploy` 一次。

---

### API 参考

#### `POST /upload` — 上传文档

请求格式：`multipart/form-data`

| 字段 | 类型 | 必须 | 默认 | 说明 |
|------|------|------|------|------|
| `file` | File | ✅ | — | `.md` / `.html` 文件，最大 2MB |
| `expires` | string | — | `7d` | 过期时间：`7d` / `30d` / `never` |

成功响应 `200`：

```json
{
  "id": "abc12345",
  "url": "https://filebridge.workers.dev/s/abc12345",
  "qrcode": "data:image/svg+xml;base64,...",
  "title": "文档标题",
  "description": "摘要...",
  "wordCount": 1234,
  "expires": "2026-06-07T15:31:09Z",
  "createdAt": "2026-05-31T15:31:09Z"
}
```

错误响应：

| 状态码 | 说明 |
|--------|------|
| `400` | 格式不支持或缺少 file 字段 |
| `413` | 文件超过 2MB |
| `500` | 服务器渲染错误 |

#### `GET /s/:id` — 阅读文档

直接返回移动端 HTML，无跳转。

| 状态码 | 说明 |
|--------|------|
| `200` | 正常返回 HTML |
| `404` | 文档不存在（ID 错误或已被清理） |
| `410` | 文档已过期 |

#### `GET /s/:id/meta` — 文档元数据

```json
{
  "title": "文档标题",
  "filename": "README.md",
  "size": 12345,
  "wordCount": 800,
  "createdAt": "...",
  "expiresAt": "..."
}
```

#### `GET /` — 服务状态

---

### 项目结构

```
filebridge/
├── worker/                     # ☁️ Cloudflare Workers 服务
│   ├── wrangler.toml           # Workers 配置（R2 + KV 绑定）
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Hono 路由入口
│       ├── routes/
│       │   ├── upload.ts       # POST /upload
│       │   └── view.ts         # GET /s/:id  GET /s/:id/meta
│       ├── render/
│       │   ├── markdown.ts     # MD/HTML → 移动端 HTML（marked + highlight.js）
│       │   ├── template.ts     # HTML 模板 + 404/410 页面
│       │   └── style.ts        # 移动端主题 CSS（inline）
│       └── utils/
│           ├── id.ts           # 8位随机 ID（Web Crypto）
│           └── qrcode.ts       # 纯 JS QR 码生成（无外部依赖）
│
├── skill/                      # 🤖 AI IDE Skill（零依赖）
│   ├── SKILL.md                # Skill 描述 + 触发词
│   └── src/
│       └── index.ts            # bridgeFile() / bridgeContent()
│
├── deploy.sh                   # 部署向导脚本
├── .gitignore
├── LICENSE
└── README.md
```

### 技术选型说明

| 模块 | 选型 | 理由 |
|------|------|------|
| 运行时 | Cloudflare Workers | 边缘计算，全球低延迟，免费额度足够个人使用 |
| 框架 | [Hono](https://hono.dev) | 专为 Workers 设计，TypeScript 友好，体积极小 |
| Markdown | [marked](https://marked.js.org) | 轻量、Workers 友好，无 Node.js 依赖 |
| 代码高亮 | [highlight.js](https://highlightjs.org)（按需注册语言） | 只打包用到的语言，控制 Worker 体积 |
| 存储 | Cloudflare R2 | 免费 10GB/月，与 Worker 同平台零延迟访问 |
| 元数据 | Cloudflare KV | 原生 TTL 支持，过期自动处理 |
| 二维码 | 自实现（纯 JS，无依赖） | Worker 体积限制，避免引入大型库 |
| Skill 端 | 纯 Node.js 内置 API | 零依赖，任意 AI IDE 即插即用 |

### 免费额度说明（Cloudflare 免费层）

| 资源 | 免费额度 | 个人使用预估 |
|------|---------|------------|
| Workers 请求 | 10万次/天 | < 1000次/天 |
| R2 存储 | 10GB | < 100MB |
| R2 Class B 操作 | 1000万次/月 | 可忽略 |
| KV 读取 | 10万次/天 | 可忽略 |

**结论：个人 + 小团队使用完全免费。**

### 贡献

欢迎 PR！主要方向：

- 🎨 更多主题（暗色模式、GitHub 风格等）
- 🔒 密码保护功能（接口已预留字段）
- 📊 阅读统计（访问次数）
- 🌍 多语言 404/410 页面
- 📱 PWA 支持

### License

[MIT](LICENSE) © 2026 xuwenhao03

---

## English

### What is FileBridge?

FileBridge is a lightweight middleware that bridges AI-generated Markdown/HTML documents to mobile-friendly shareable links — perfect for sharing via WeChat, Telegram, or any messenger.

**The flow:**

```
Your .md file
    ↓  Upload via FileBridge (one command)
Cloudflare Edge Server
    ├── Renders to mobile-optimized HTML (syntax highlighting, tables, TOC)
    ├── Hosts for 7 days (auto-expires)
    └── Returns URL + QR code
         ↓
Share QR code on WeChat  →  Friend scans  →  Reads on phone
```

### Quick Start

```bash
# Upload your document (using public demo — deploy your own for production)
curl -F "file=@README.md" https://filebridge.workers.dev/upload

# Response:
# {
#   "url": "https://filebridge.workers.dev/s/abc12345",
#   "qrcode": "data:image/svg+xml;base64,...",
#   ...
# }
```

### Self-Deploy (Free, Recommended)

> **Requirements**: [Cloudflare account](https://cloudflare.com) (free) + Node.js 18+

```bash
# 1. Clone and install
git clone https://github.com/xuwenhao03/filebridge.git
cd filebridge/worker && npm install

# 2. Login to Cloudflare
npx wrangler auth login

# 3. Create resources
npx wrangler r2 bucket create filebridge-docs
npx wrangler kv namespace create DOC_META
# → Copy the output id and preview_id into wrangler.toml

# 4. Test locally
npx wrangler dev

# 5. Deploy
npx wrangler deploy
```

### API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload `.md` or `.html` file, get URL + QR code |
| `/s/:id` | GET | View rendered document (mobile HTML) |
| `/s/:id/meta` | GET | Get document metadata (JSON) |
| `/` | GET | Service health check |

### License

[MIT](LICENSE)
