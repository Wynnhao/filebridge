/**
 * utils/helper.js
 * 通用工具函数
 */

/**
 * 生成 8 位随机 shareCode（base62：a-z A-Z 0-9）
 * // codeflicker-fix: EDGE-Issue-001/2sfzcykvrat5gct6j21b
 */
function generateShareCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 从内容中提取标题
 * - HTML：提取 <title> 或 <h1> 标签内容
 * - Markdown：提取第一个 # 标题
 */
function extractTitle(content, fallback = '未命名文档') {
  if (!content) return fallback

  // HTML 文件：优先用 <title>，其次 <h1>
  if (content.trim().startsWith('<!') || content.trim().startsWith('<html')) {
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return titleMatch[1].trim().slice(0, 50)
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) return h1Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 50)
    return fallback
  }

  // Markdown：提取第一个 # 标题
  const match = content.match(/^#{1,6}\s+(.+)$/m)
  if (match) {
    return match[1].trim().replace(/\*\*/g, '').replace(/`/g, '').slice(0, 50)
  }
  const firstLine = content.split('\n').find(line => line.trim().length > 0)
  if (firstLine) {
    return firstLine.trim().slice(0, 30)
  }
  return fallback
}

/**
 * 统计字数（中文按字符计，英文按单词计）
 */
function countWords(content) {
  if (!content) return 0
  // 去除 markdown 语法符号
  const plain = content
    .replace(/```[\s\S]*?```/g, '')  // 代码块
    .replace(/`[^`]*`/g, '')          // 行内代码
    .replace(/!\[.*?\]\(.*?\)/g, '') // 图片
    .replace(/\[.*?\]\(.*?\)/g, '')  // 链接
    .replace(/#{1,6}\s/g, '')         // 标题符号
    .replace(/[*_~>]/g, '')           // 格式符号
  const chineseCount = (plain.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = plain.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(w => w.length > 0).length
  return chineseCount + englishWords
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * 格式化相对时间（"刚刚"、"3分钟前"等）
 */
function formatRelativeTime(dateStr) {
  const now = Date.now()
  const past = new Date(dateStr).getTime()
  const diff = now - past
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 从 HTML 内容中去除 <style> 和 <script> 标签及其内容
 * // codeflicker-fix: COMPAT-Issue-004/2sfzcykvrat5gct6j21b
 */
function stripHtmlStyles(content) {
  // 去除 <style> 标签及其内容
  let cleaned = content.replace(/<style[\s\S]*?<\/style>/gi, '')
  // 去除 <script> 标签及其内容
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '')
  // 去除 style 属性
  cleaned = cleaned.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
  return cleaned
}

/**
 * 格式化过期时间展示
 */
function formatExpiry(expiresAt) {
  if (!expiresAt) return '永不过期'
  const d = new Date(expiresAt)
  const now = new Date()
  const diffDays = Math.ceil((d - now) / 86400000)
  if (diffDays < 0) return '已过期'
  if (diffDays === 0) return '今天过期'
  if (diffDays === 1) return '明天过期'
  return `${diffDays} 天后过期`
}

module.exports = {
  generateShareCode,
  extractTitle,
  countWords,
  formatFileSize,
  formatRelativeTime,
  formatExpiry,
  stripHtmlStyles,
}
