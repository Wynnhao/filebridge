import { marked, type Tokens } from 'marked'
import hljs from 'highlight.js/lib/core'
// 注册常用语言（控制 Worker 体积）
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import sql from 'highlight.js/lib/languages/sql'
import rust from 'highlight.js/lib/languages/rust'
import java from 'highlight.js/lib/languages/java'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import { buildMobileHtml } from './template.js'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('go', go)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('java', java)
hljs.registerLanguage('css', css)
hljs.registerLanguage('markdown', markdown)

export interface RenderResult {
  html: string
  title: string
  description: string
  wordCount: number
}

/** 提取文本内容（去 HTML 标签，用于字数统计）*/
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

/** 统计字数 */
function countWords(text: string): number {
  const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const en = (text.match(/\b[a-zA-Z]+\b/g) || []).length
  return cn + en
}

/** 从 Markdown 或 HTML 提取第一段作为描述 */
function extractDescription(text: string): string {
  const plain = stripHtml(text).replace(/\s+/g, ' ').trim()
  return plain.slice(0, 150) + (plain.length > 150 ? '…' : '')
}

/** 设置 marked 渲染器（代码高亮 + 表格包裹） */
function setupMarked(): void {
  const renderer = new marked.Renderer()

  renderer.code = ({ text, lang }: Tokens.Code) => {
    let highlighted: string
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
      } catch {
        highlighted = escapeHtml(text)
      }
    } else {
      highlighted = hljs.highlightAuto(text).value
    }
    return `<pre><code class="hljs language-${escapeHtml(lang || 'text')}">${highlighted}</code></pre>`
  }

  renderer.table = (token: Tokens.Table) => {
    // 先用默认渲染器生成表格，再包裹
    const defaultTable = marked.Renderer.prototype.table.call(renderer, token)
    return `<div class="fb-table-wrap">${defaultTable}</div>`
  }

  // 标题加锚点 id
  let headingIdx = 0
  renderer.heading = ({ text, depth }: Tokens.Heading) => {
    headingIdx++
    const slug = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '').slice(0, 40)
    const id = `${slug}-${headingIdx}`
    const inner = marked.parseInline(text) as string
    return `<h${depth} id="${id}" data-vd-id="heading-${headingIdx}">${inner}</h${depth}>\n`
  }

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: false,
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

setupMarked()

/** 从渲染后 HTML 中提取标题列表，用于 TOC */
function extractHeadings(html: string): Array<{ depth: number; text: string; id: string }> {
  const matches = [...html.matchAll(/<h([1-6])\s+id="([^"]+)"[^>]*>(.*?)<\/h[1-6]>/gi)]
  return matches.map(m => ({
    depth: parseInt(m[1]),
    text: m[3].replace(/<[^>]+>/g, '').trim(),
    id: m[2],
  }))
}

/** 生成 TOC HTML */
function buildToc(headings: Array<{ depth: number; text: string; id: string }>): string {
  const filtered = headings.filter(h => h.depth <= 3)
  if (filtered.length < 2) return ''
  const items = filtered.map(h => {
    const cls = h.depth === 3 ? ' class="fb-toc-h3"' : ''
    return `<li${cls}><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`
  }).join('\n')
  return `<nav class="fb-toc"><div class="fb-toc-hd"><span class="fb-toc-title">目录</span><button id="fbTocToggle" type="button">收起 ▴</button></div><ul class="fb-toc-list" id="fbTocList">${items}</ul></nav>`
}

/** 渲染 Markdown → 自包含移动端 HTML */
export async function renderMarkdown(content: string, filename = 'document'): Promise<RenderResult> {
  // 提取 frontmatter（简单正则，不引入 gray-matter）
  let title = ''
  let markdownBody = content
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/)
  if (fmMatch) {
    markdownBody = content.slice(fmMatch[0].length)
    const titleMatch = fmMatch[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
    if (titleMatch) title = titleMatch[1].trim()
  }

  // 从第一个 H1 提取标题
  if (!title) {
    const h1 = markdownBody.match(/^#\s+(.+)$/m)
    if (h1) title = h1[1].trim()
  }
  if (!title) title = filename.replace(/\.(md|markdown|html?)$/i, '')

  const contentHtml = await marked.parse(markdownBody)
  const headings = extractHeadings(contentHtml)
  const toc = buildToc(headings)
  const description = extractDescription(contentHtml)
  const wordCount = countWords(stripHtml(contentHtml))
  const date = new Date().toISOString().split('T')[0]

  const html = buildMobileHtml({
    title,
    description,
    content: contentHtml,
    toc,
    date,
    wordCount,
    sourceUrl: '',
  })

  return { html, title, description, wordCount }
}

/** 渲染 HTML 文件 → 移动端 HTML（清洗 + 注入主题） */
export async function renderHtml(rawHtml: string, filename = 'document'): Promise<RenderResult> {
  // 提取标题
  let title = ''
  const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) title = titleMatch[1].trim()
  if (!title) {
    const h1Match = rawHtml.match(/<h1[^>]*>([^<]*)<\/h1>/i)
    if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim()
  }
  if (!title) title = filename.replace(/\.html?$/i, '')

  // 提取 body 内容
  let body = rawHtml
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) body = bodyMatch[1]

  // 轻量清洗（不使用 sanitize-html，Worker 体积限制）
  const cleaned = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '#')

  const headings = extractHeadings(cleaned)
  const toc = buildToc(headings)
  const description = extractDescription(cleaned)
  const wordCount = countWords(stripHtml(cleaned))
  const date = new Date().toISOString().split('T')[0]

  const html = buildMobileHtml({
    title,
    description,
    content: cleaned,
    toc,
    date,
    wordCount,
    sourceUrl: '',
  })

  return { html, title, description, wordCount }
}
