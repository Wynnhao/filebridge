/**
 * packages-doc-bridge/utils/helper.js
 * doc-bridge SKILL 内部工具函数（纯函数，不依赖主包模块）
 * 
 * 从主包 utils/helper.js 中复制的纯函数，用于独立分包内部引用。
 * 注意：这些函数需要与主包版本保持同步。
 * 
 * // codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur
 */

/**
 * 生成 8 位随机 shareCode（base62：a-z A-Z 0-9）
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

  if (content.trim().startsWith('<!') || content.trim().startsWith('<html')) {
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return titleMatch[1].trim().slice(0, 50)
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) return h1Match[1].replace(/<[^>]+>/g, '').trim().slice(0, 50)
    return fallback
  }

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
  const plain = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~>]/g, '')
  const chineseCount = (plain.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = plain.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(w => w.length > 0).length
  return chineseCount + englishWords
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
  formatExpiry
}