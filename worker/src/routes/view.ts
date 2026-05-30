import type { Context } from 'hono'
import { build404Html, build410Html } from '../render/template.js'

interface Env {
  DOCS_BUCKET: R2Bucket
  DOC_META: KVNamespace
}

interface DocMeta {
  title: string
  description: string
  filename: string
  size: number
  wordCount: number
  createdAt: string
  expiresAt: string | null
}

export async function handleView(c: Context<{ Bindings: Env }>): Promise<Response> {
  const id = c.req.param('id')

  if (!id || !/^[a-z0-9]{6,12}$/.test(id)) {
    return new Response(build404Html(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 查 KV 元数据
  const metaRaw = await c.env.DOC_META.get(`doc:${id}`)
  if (!metaRaw) {
    return new Response(build404Html(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const meta: DocMeta = JSON.parse(metaRaw)

  // 检查是否过期
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    // 清理 R2（异步，不阻塞响应）
    c.executionCtx.waitUntil(c.env.DOCS_BUCKET.delete(`docs/${id}.html`))
    return new Response(build410Html(), {
      status: 410,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 从 R2 读取 HTML
  const object = await c.env.DOCS_BUCKET.get(`docs/${id}.html`)
  if (!object) {
    return new Response(build404Html(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const html = await object.text()

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',  // 5分钟缓存
      'X-Doc-Title': encodeURIComponent(meta.title),
    },
  })
}

/** GET /s/:id/meta - 返回文档元数据 */
export async function handleMeta(c: Context<{ Bindings: Env }>): Promise<Response> {
  const id = c.req.param('id')
  const metaRaw = await c.env.DOC_META.get(`doc:${id}`)
  if (!metaRaw) {
    return c.json({ error: '文档不存在' }, 404)
  }
  return c.json(JSON.parse(metaRaw))
}
