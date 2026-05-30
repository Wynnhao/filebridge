import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleUpload } from './routes/upload.js'
import { handleView, handleMeta } from './routes/view.js'

interface Env {
  DOCS_BUCKET: R2Bucket
  DOC_META: KVNamespace
  BASE_URL: string
  MAX_FILE_SIZE_MB: string
  DEFAULT_EXPIRES_DAYS: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS（允许 Skill 从任意来源上传）
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 健康检查
app.get('/', c => c.json({
  name: 'FileBridge',
  version: '0.1.0',
  description: 'AI 文档移动端中间件 - MD/HTML → 移动端可分享链接',
  endpoints: {
    upload: 'POST /upload',
    view: 'GET /s/:id',
    meta: 'GET /s/:id/meta',
  },
}))

// 上传
app.post('/upload', handleUpload)

// 阅读页
app.get('/s/:id', handleView)

// 元数据
app.get('/s/:id/meta', handleMeta)

// 404
app.notFound(c => c.json({ error: '接口不存在' }, 404))

// 全局错误处理
app.onError((err, c) => {
  console.error('FileBridge Worker Error:', err)
  return c.json({ error: '服务器内部错误', detail: err.message }, 500)
})

export default app
