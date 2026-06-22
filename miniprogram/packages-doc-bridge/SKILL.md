# doc-bridge SKILL

马档文档传阅技能。帮助用户上传 Markdown/HTML/TXT 文档、查看文档列表、获取分享码、删除文档。

## 一、业务流程

### 分支 1：用户上传文档

```
用户表达上传意图（"上传文档"/"分享文件"/"发个文档"）
  ↓
判断：用户是否已提供文件或内容？
  ├── 已发送文件/粘贴文本 → uploadDocument
  └── 未提供 → 引导用户发送文件或粘贴内容
  ↓
uploadDocument 返回成功 → 展示 doc-detail-card 原子卡片（含分享码）
```

### 分支 2：用户查看文档列表

```
用户表达查看意图（"我的文档"/"查看文档"/"搜索XX"）
  ↓
searchMyDocs（可选传 keyword 参数）
  ↓
展示 doc-list-card 原子卡片列表
  ↓
用户选择某篇文档 → getDocumentInfo → 展示 doc-detail-card
```

### 分支 3：用户获取文档详情/分享码

```
用户表达详情意图（"分享码是多少"/"那个XX文档"/"文档详情"）
  ↓
getDocumentInfo（需要文档标识）
  ↓
展示 doc-detail-card 原子卡片
```

### 分支 4：用户删除文档

```
用户表达删除意图（"删除XX文档"/"删掉那个"）
  ↓
如未指定具体文档 → 先调用 searchMyDocs 让用户确认
如已指定 → deleteDocument
  ↓
deleteDocument 返回成功 → 文本告知用户已删除
```

## 二、接口依赖关系

| 原子接口 | 前置条件 | 说明 |
|---------|---------|------|
| uploadDocument | 用户已发送文件（聊天框多模态上传）或粘贴文本内容 | 支持 .md/.html/.txt 文件和纯文本粘贴 |
| searchMyDocs | 无 | 可传 keyword 参数按标题搜索 |
| getDocumentInfo | 需通过 searchMyDocs 或 uploadDocument 获取文档的 shareCode 或 docId | 优先用 shareCode 查询 |
| deleteDocument | 需确认用户要删除的具体文档 | 先展示文档信息让用户确认 |

## 三、业务约束

### 3.1 输出形态
- 文档列表结果必须使用 doc-list-card 原子组件展示，不可纯文本列出
- 文档详情结果必须使用 doc-detail-card 原子组件展示，不可纯文本列出
- 操作类（上传成功、删除成功）结果的卡片后，应追加一句自然语言确认

### 3.2 执行顺序
- uploadDocument 返回成功前，不要向用户宣称"已上传完成"
- deleteDocument 执行前，必须先让用户确认要删除的文档
- 获取分享码展示前，确保 uploadDocument 或 getDocumentInfo 已成功返回

### 3.3 数据来源
- 分享码（shareCode）必须来自 uploadDocument 或 getDocumentInfo 的真实返回，不可编造
- 文档 ID（docId）必须来自 searchMyDocs 或 uploadDocument 的返回结果

### 3.4 有效期处理
- 文档默认 7 天有效期
- 过期文档在 searchMyDocs 结果中会被过滤，返回中不展示
- 如果 getDocumentInfo 查询到已过期的文档，应告知用户文档已过期

### 3.5 文件类型
- 支持 .md、.html、.htm、.txt 四种文件格式
- 用户粘贴纯文本时，自动识别内容类型（Markdown/HTML/纯文本）

### 3.6 重复上传处理
- 同一用户重复上传相同内容时，uploadDocument 不会创建新记录，而是复用已有的分享码
- 原子接口检测到内容重复后，应告知用户"这篇文档你已经上传过了"，展示已有分享码
- 过期文档或已删除文档重新上传视为新文档，不参与去重
- 不同用户上传相同内容是各自独立的，互不影响