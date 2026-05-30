/**
 * 生成 8 位随机 ID（URL 安全，无歧义字符）
 * 使用 Web Crypto API，在 Cloudflare Workers 中原生可用
 */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz' // 无 0/O/I/1/l 等易混淆字符

export function generateId(length = 8): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => ALPHABET[b % ALPHABET.length])
    .join('')
}
