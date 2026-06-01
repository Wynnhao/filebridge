# 飞文（FileBridge）微信小程序版

在微信小程序内直接上传、渲染并分享 `.md` / `.html` 文档。

## 技术栈

- **渲染**：[towxml](https://github.com/sbfkcel/towxml) (Markdown/HTML → WXML 原生渲染)
- **存储**：微信云开发 CloudBase（云存储 + 云数据库 + 云函数）
- **主体要求**：支持个人主体（无需 web-view）

## 项目结构

```
miniprogram/
├── app.js / app.json / app.wxss   # 小程序入口
├── behaviors/
│   └── docRenderer.js   文档渲染共享 Behavior
├── pages/
│   ├── index/      首页（上传 + 文档列表 + 删除）
│   ├── preview/    文档预览（上传者查看 + 分享）
│   ├── share/      分享页
│   └── viewer/     接收端查看页（保存/转发）
├── utils/
│   ├── helper.js   工具函数
│   ├── cloud.js    云开发封装（含 mock 数据）
│   └── mock.js     测试用 mock 数据
└── cloudfunctions/
    ├── login/            获取用户 openid
    ├── getDocContent/    获取文档内容
    ├── deleteDoc/        删除文档（含权限校验）
    └── cleanupExpired/   定时清理过期文档
```

## 快速开始

### 方式一：本地开发（Mock 模式，无需云开发）

1. 用微信开发者工具打开 `miniprogram/` 目录
2. AppID 填入自己的小程序 AppID 或使用测试号
3. 修改 `utils/cloud.js`，将 `USE_MOCK = true`
4. 安装 towxml：
   ```bash
   cd miniprogram
   npm install
   ```
5. 开发者工具 → 工具 → 构建 npm
6. 编译运行，数据均为 mock 数据

### 方式二：接入云开发（正式部署）

1. 注册正式小程序账号（个人主体），AppID: `wx0992f0cfb248a860`
2. 开通云开发，记录 `envId`（当前: `cloud1-d9g5twb0u156be074`）
3. 修改 `utils/cloud.js`，将 `USE_MOCK = false`
4. 在开发者工具部署云函数：`login` / `getDocContent` / `deleteDoc` / `cleanupExpired`
5. 创建云数据库 `docs` 集合，设置安全规则 `{ "read": true, "write": "doc._openid == auth.openid" }`
6. 插入指南文档记录（shareCode: `guide000`，isGuide: true）

## 核心流程

```
上传者：
  选文件/粘贴内容 → 读取内容 → 上传云存储 → 写数据库 → 跳转预览 → 分享卡片

接收者：
  扫码/点卡片 → viewer 页 → 调 getDocContent 云函数 → towxml 渲染
```

## 上传方式

- 💬 **聊天文件** — 从微信聊天记录选取 `.md` / `.html` 文件
- 📁 **本地文件** — 从手机本地文件系统选取（部分安卓机型支持）
- 📋 **粘贴内容** — 直接粘贴 Markdown/HTML 文本内容（自动推断文件类型）

## 分享码

每个文档生成唯一 8 位 shareCode（如 `abcd1234`），携带在小程序卡片参数中。
接收者无需登录即可查看文档（isPublic: true 的文档）。

## 注意事项

- towxml 对复杂表格和数学公式支持有限，适合普通文章/报告分享
- 文件大小建议 < 500KB（云开发下行流量限制）
- 文档默认 7 天过期，指南文档（isGuide: true）永不过期
- 文档所有者可在首页列表中点击删除按钮删除文档