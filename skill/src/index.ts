/**
 * FileBridge Skill - 极轻量版
 * 唯一依赖：Node.js 内置 API（fs + path + fetch）
 * 将 MD/HTML 文件上传到 FileBridge 服务，返回短链和二维码
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const DEFAULT_API_URL = 'https://filebridge.workers.dev'

export interface BridgeOptions {
  /** FileBridge 服务 URL，默认使用官方部署 */
  apiUrl?: string
  /** 过期时间：'7d' | '30d' | 'never'，默认 '7d' */
  expires?: string
  /** 是否将二维码保存为文件 */
  saveQrcode?: boolean
}

export interface BridgeResult {
  /** 可分享的短链 */
  url: string
  /** 二维码 SVG data URL */
  qrcode: string
  /** 文档标题 */
  title: string
  /** 文档摘要 */
  description: string
  /** 过期时间 */
  expires: string | null
  /** 文档 ID */
  id: string
}

/**
 * 上传文件到 FileBridge 服务
 */
export async function bridgeFile(
  filePath: string,
  options: BridgeOptions = {}
): Promise<BridgeResult> {
  const absPath = resolve(process.cwd(), filePath)

  if (!existsSync(absPath)) {
    throw new Error(`文件不存在：${absPath}`)
  }

  const filename = basename(absPath)
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (!['md', 'markdown', 'html', 'htm'].includes(ext)) {
    throw new Error(`不支持的格式 .${ext}，请提供 .md 或 .html 文件`)
  }

  const apiUrl = options.apiUrl || process.env['FILEBRIDGE_API_URL'] || DEFAULT_API_URL
  const content = readFileSync(absPath)

  // 构建 FormData（Node.js 18+ 原生支持）
  const formData = new FormData()
  formData.append('file', new Blob([content], { type: 'text/plain' }), filename)
  if (options.expires) {
    formData.append('expires', options.expires)
  }

  console.log(`📤 FileBridge: 上传 ${filename} 到 ${apiUrl}...`)

  const response = await fetch(`${apiUrl}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText })) as { error: string }
    throw new Error(`上传失败 (${response.status})：${err.error || response.statusText}`)
  }

  const result = await response.json() as BridgeResult & { wordCount?: number }

  // 可选：保存二维码 SVG
  if (options.saveQrcode && result.qrcode) {
    const qrPath = absPath.replace(/\.(md|markdown|html?)$/i, '.qrcode.svg')
    // 从 data URL 提取 SVG 内容
    const svgContent = Buffer.from(result.qrcode.split(',')[1], 'base64').toString('utf-8')
    writeFileSync(qrPath, svgContent)
    console.log(`💾 二维码已保存：${qrPath}`)
  }

  console.log(`✅ 已生成：${result.url}`)
  console.log(`📄 标题：${result.title}`)
  if (result.expires) {
    console.log(`⏰ 过期：${new Date(result.expires).toLocaleString('zh-CN')}`)
  }

  return result
}

/**
 * 从文本内容上传（不需要文件）
 */
export async function bridgeContent(
  content: string,
  filename: string,
  options: BridgeOptions = {}
): Promise<BridgeResult> {
  const apiUrl = options.apiUrl || process.env['FILEBRIDGE_API_URL'] || DEFAULT_API_URL

  const formData = new FormData()
  formData.append('file', new Blob([content], { type: 'text/plain' }), filename)
  if (options.expires) {
    formData.append('expires', options.expires)
  }

  const response = await fetch(`${apiUrl}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText })) as { error: string }
    throw new Error(`上传失败 (${response.status})：${err.error || response.statusText}`)
  }

  return await response.json() as BridgeResult
}
