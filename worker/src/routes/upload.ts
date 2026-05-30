import type { Context } from 'hono'
import { generateId } from '../utils/id.js'
import { generateQRCodeDataUrl } from '../utils/qrcode.js'
import { renderMarkdown, renderHtml } from '../render/markdown.js'

interface Env {
  DOCS_BUCKET: R2Bucket
  DOC_META: KVNamespace
  BASE_URL: string
  MAX_FILE_SIZE_MB: string
  DEFAULT_EXPIRES_DAYS: string
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

export async function handleUpload(c: Context<{ Bindings: Env }>): Promise<Response> {
  const maxSizeMB = parseFloat(c.env.MAX_FILE_SIZE_MB || '2')
  const defaultExpiresDays = parseInt(c.env.DEFAULT_EXPIRES_DAYS || '7')

  // 解析 multipart form-data
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: '请求格式错误，需要 multipart/form-data' }, 400)
  }

  const fileField = formData.get('file')
  if (!fileField || !(fileField instanceof File)) {
    return c.json({ error: '缺少 file 字段，请上传 .md 或 .html 文件' }, 400)
  }

  const filename = fileField.name || 'document.md'
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (!['md', 'markdown', 'html', 'htm'].includes(ext)) {
    return c.json({ error: `不支持的文件格式 .${ext}，请上传 .md 或 .html 文件` }, 400)
  }

  // 文件大小限制
  if (fileField.size > maxSizeMB * 1024 * 1024) {
    return c.json({ error: `文件过大，最大支持 ${maxSizeMB}MB（当前 ${(fileField.size / 1024 / 1024).toFixed(2)}MB）` }, 413)
  }

  const content = await fileField.text()

  // 渲染
  let renderResult: Awaited<ReturnType<typeof renderMarkdown>>
  try {
    if (ext === 'md' || ext === 'markdown') {
      renderResult = await renderMarkdown(content, filename)
    } else {
      renderResult = await renderHtml(content, filename)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `渲染失败：${msg}` }, 500)
  }

  // 生成 ID 和元数据
  const id = generateId(8)
  const baseUrl = c.env.BASE_URL || `https://${c.req.header('host')}`
  const url = `${baseUrl}/s/${id}`

  // 计算过期时间
  const expiresDaysParam = formData.get('expires')
  let expiresAt: string | null = null
  let kvTtl: number | undefined

  if (expiresDaysParam === 'never') {
    expiresAt = null
  } else {
    const days = expiresDaysParam ? parseInt(String(expiresDaysParam)) : defaultExpiresDays
    if (!isNaN(days) && days > 0) {
      const dt = new Date(Date.now() + days * 24 * 3600 * 1000)
      expiresAt = dt.toISOString()
      kvTtl = days * 24 * 3600
    }
  }

  const meta: DocMeta = {
    title: renderResult.title,
    description: renderResult.description,
    filename,
    size: fileField.size,
    wordCount: renderResult.wordCount,
    createdAt: new Date().toISOString(),
    expiresAt,
  }

  // 写入 R2
  await c.env.DOCS_BUCKET.put(`docs/${id}.html`, renderResult.html, {
    httpMetadata: {
      contentType: 'text/html; charset=utf-8',
    },
    customMetadata: {
      title: meta.title,
      filename,
    },
  })

  // 写入 KV（带 TTL）
  const kvOptions: KVNamespacePutOptions = {}
  if (kvTtl) kvOptions.expirationTtl = kvTtl
  await c.env.DOC_META.put(`doc:${id}`, JSON.stringify(meta), kvOptions)

  // 生成二维码
  const qrcode = generateQRCodeDataUrl(url, 200)

  return c.json({
    id,
    url,
    qrcode,
    title: meta.title,
    description: meta.description,
    wordCount: meta.wordCount,
    expires: expiresAt,
    createdAt: meta.createdAt,
  })
}
