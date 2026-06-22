// behaviors/docRenderer.js
// 文档渲染共享逻辑 — preview 和 viewer 页面共用
// codeflicker-fix: REFACTOR-Issue-001/axj1q4pib3s0gmuphu0d

const { getDocContent } = require('../utils/cloud')
const { countWords, formatExpiry, stripHtmlStyles } = require('../utils/helper')

let towxml
try {
  towxml = require('/towxml/index')
} catch (e) {
  towxml = null
}

module.exports = Behavior({
  data: {
    // 文档信息
    shareCode: '',
    title: '',
    fileType: 'md',
    wordCount: 0,
    viewCount: 0,
    expiryText: '',

    // 渲染数据
    nodes: null,
    rawContent: '',
    towxmlAvailable: false,
    hasExternalStyle: false,

    // 主题
    theme: 'light',  // 'light' | 'dark'

    // 字号 s | m | l
    fontSize: 'm',

    // 字号滑动条
    showFontSlider: false,
    fontLevel: 2,    // 0-4 共 5 档，默认 2 (中)

    // 读取进度
    scrollTop: 0,
    scrollToId: '',

    // 目录
    showToc: false,
    tocItems: [],

    // 状态
    loading: true,
    error: null,
  },

  methods: {
    // 空方法，用于阻止事件冒泡
    noop() {},
    // 初始化 towxml 可用性（在 onLoad 中调用）
    initTowxml() {
      this.setData({ towxmlAvailable: !!towxml })
    },

    // 从云端加载文档内容
    // codeflicker-fix: EDGE-Issue-006/7k3sz5llqevbucvw3joj — 添加友好错误提示
    async loadContent(shareCode) {
      this.setData({ loading: true, error: null })
      const { success, data, error } = await getDocContent(shareCode)

      if (!success) {
        const errorMessages = {
          'NOT_FOUND': '文档不存在或已被删除',
          'EXPIRED': '此文档已过期',
          'NETWORK_ERROR': '网络连接失败，请检查网络',
          'SERVER_ERROR': '服务器异常，请稍后再试',
          'INVALID_PARAM': '文档编码格式不正确',
          'UNKNOWN': '加载失败，请重试',
        }
        const message = errorMessages[error] || errorMessages['UNKNOWN']
        wx.showToast({ title: message, icon: 'none', duration: 2500 })
        this.setData({ loading: false, error: error || 'UNKNOWN' })
        return
      }

      const fileType = data.fileType || 'md'
      const hasExternalStyle = fileType === 'html' && /<style[\s\S]*?>/i.test(data.content)
      this.setData({
        wordCount: countWords(data.content),
        viewCount: data.viewCount || 0,
        expiryText: formatExpiry(data.expiresAt),
        fileType,
        hasExternalStyle,
      })
      this.renderContent(data.content, fileType)
    },

    // 渲染文档内容
    renderContent(content, fileType) {
      // TXT 文件不走 towxml，直接显示原始内容
      if (fileType === 'txt') {
        this._lastContent = content
        this.setData({ rawContent: content, loading: false })
        // 恢复阅读进度
        setTimeout(() => this.restoreReadPos(), 200)
        return
      }

      // HTML 文件：先清理 <style> 和 <script> 标签
      let renderContent = content
      if (fileType === 'html' && /<style[\s\S]*?>/i.test(content)) {
        renderContent = stripHtmlStyles(content)
      }

      // 缓存原始内容，供主题切换时重新渲染
      this._lastContent = renderContent

      // MD 文件：提取目录结构
      if (fileType === 'md') {
        const tocItems = this.extractToc(renderContent)
        this.setData({ tocItems })
      }

      if (towxml) {
        // 根据内容长度决定延迟时间（大内容需要更多时间让 UI 先更新）
        const contentLength = renderContent.length
        const delay = contentLength > 5000 ? 300 : contentLength > 2000 ? 200 : 100

        // 先让 UI 更新到"已加载"状态，再延迟执行 towxml 解析（避免主线程阻塞超时）
        this.setData({ loading: false })
        setTimeout(() => {
          try {
            const nodes = towxml(renderContent, fileType === 'html' ? 'html' : 'markdown', {
              theme: this.data.theme,
              events: { tap: this.handleNodeTap.bind(this) }
            })
            this.setData({ nodes })
            // 恢复阅读进度
            setTimeout(() => this.restoreReadPos(), 200)
          } catch (e) {
            console.warn('towxml parse error, fallback to raw:', e)
            this.setData({ rawContent: renderContent })
          }
        }, delay)
        return
      }
      // towxml 不可用 → 显示原始内容
      this.setData({ rawContent: renderContent, loading: false })
    },

    // 切换主题
    toggleTheme() {
      const newTheme = this.data.theme === 'light' ? 'dark' : 'light'
      this.setData({ theme: newTheme })
      // 重新渲染以应用新主题
      if (this.data.rawContent || this.data.nodes) {
        const content = this.data.rawContent || this._lastContent
        const fileType = this.data.fileType
        if (content) this.renderContent(content, fileType)
      }
    },

    // 切换字号：展开/收起滑动条
    toggleFontSlider() {
      this.setData({ showFontSlider: !this.data.showFontSlider })
    },

    // 滑块值变化 → 计算字号档位
    // 0→XS(22rpx)  1→S(26rpx)  2→M(30rpx)  3→L(34rpx)  4→XL(38rpx)
    handleFontSliderChange(e) {
      const level = e.detail.value
      const map = { 0: 'xs', 1: 's', 2: 'm', 3: 'l', 4: 'xl' }
      this.setData({ fontLevel: level, fontSize: map[level] || 'm' })
    },

    // 提取 Markdown 目录
    extractToc(content) {
      if (!content) return []
      const headings = []
      const regex = /^(#{1,6})\s+(.+)$/gm
      let match
      let idx = 0
      while ((match = regex.exec(content)) !== null) {
        headings.push({
          level: match[1].length,
          text: match[2].replace(/\*\*/g, '').replace(/`/g, '').trim(),
          anchor: `heading-${idx++}`,
        })
      }
      return headings
    },

    // 切换目录面板
    toggleToc() {
      this.setData({ showToc: !this.data.showToc })
    },

    // 点击目录项跳转
    scrollToHeading(e) {
      const anchor = e.currentTarget.dataset.anchor
      this.setData({ showToc: false, scrollToId: anchor })
    },

    // 长按代码块 → 复制
    handleCodeLongPress(e) {
      // 尝试从 towxml 事件对象中获取文本
      const text = (e.detail && e.detail.text) || ''
      const innerText = text.trim()
      if (!innerText) {
        wx.showToast({ title: '请长按代码块区域', icon: 'none', duration: 1500 })
        return
      }
      wx.setClipboardData({
        data: innerText,
        success: () => wx.showToast({ title: '代码已复制', icon: 'success', duration: 1500 }),
      })
    },

    // 处理文档滚动（节流保存进度）
    handleDocScroll(e) {
      if (this._scrollTimer) clearTimeout(this._scrollTimer)
      this._scrollTimer = setTimeout(() => {
        const pos = e.detail.scrollTop
        if (pos != null) {
          const key = `readPos_${this.data.shareCode}`
          wx.setStorage({ key, data: pos })
        }
      }, 500)
    },

    // 恢复阅读进度
    restoreReadPos() {
      const key = `readPos_${this.data.shareCode}`
      const pos = wx.getStorageSync(key)
      if (pos > 0) {
        this.setData({ scrollTop: Math.max(0, pos - 40) })
      }
    },

    // 处理 towxml 节点点击（链接跳转等）
    handleNodeTap(e) {
      const { href } = e.currentTarget.dataset
      if (href && href.startsWith('http')) {
        wx.setClipboardData({
          data: href,
          success: () => wx.showToast({ title: '链接已复制', icon: 'none' }),
        })
      }
    },
  },
})