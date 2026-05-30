---
name: filebridge
description: >
  FileBridge 文档桥接器。当用户说"分享文档"、"上传到FileBridge"、
  "发给微信"、"转成可分享的链接"、"上传 MD"、"生成二维码"、"分享这个文档"时触发。
  将当前 Markdown 或 HTML 文档上传到 FileBridge 服务，获取可直接在微信中分享的短链和二维码。
version: 0.1.0
author: xuwenhao03
license: MIT
tags: [filebridge, sharing, wechat, mobile, markdown, qrcode]
---

# FileBridge Skill

## 功能说明

一句话将 AI 生成的 `.md` / `.html` 文档分享到微信：

1. 读取指定文档文件
2. `POST` 到 FileBridge 服务（上传原始 MD/HTML）
3. 服务端渲染为移动端 HTML 并托管（7 天有效）
4. 返回 **短链** + **二维码（SVG）**
5. 将二维码图发到微信，接收方扫码即看

## 触发词

- "分享这个文档"
- "上传到 FileBridge"
- "生成可以发微信的链接"
- "生成二维码"
- "转成手机可看的"
- "发给朋友"

## Skill 零依赖

仅使用 Node.js 18+ 内置 API（`fs`、`path`、`fetch`），无需安装任何 npm 包。

## 使用示例

```typescript
import { bridgeFile } from './src/index.ts'

// 上传文件
const result = await bridgeFile('./README.md', {
  expires: '7d',      // '7d' | '30d' | 'never'
  saveQrcode: true,   // 将二维码保存为 .qrcode.svg 文件
})

console.log(result.url)     // https://filebridge.workers.dev/s/abc12345
console.log(result.qrcode)  // data:image/svg+xml;base64,...
```

## 配置

通过环境变量配置：

```bash
# 自托管服务地址（默认使用公共服务）
export FILEBRIDGE_API_URL="https://your-worker.workers.dev"
```

## 服务端点

- 公共服务：`https://filebridge.workers.dev`（演示用，不保证可用性）
- 自托管：按照 [README.md](../README.md) 部署自己的 Worker（完全免费）
