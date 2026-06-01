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

    // 状态
    loading: true,
    error: null,
  },

  methods: {
    // 初始化 towxml 可用性（在 onLoad 中调用）
    initTowxml() {
      this.setData({ towxmlAvailable: !!towxml })
    },

    // 从云端加载文档内容
    async loadContent(shareCode) {
      this.setData({ loading: true, error: null })
      const { success, data, error } = await getDocContent(shareCode)

      if (!success) {
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
      // HTML 文件：先清理 <style> 和 <script> 标签
      let renderContent = content
      if (fileType === 'html' && /<style[\s\S]*?>/i.test(content)) {
        renderContent = stripHtmlStyles(content)
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
              theme: 'light',
              events: { tap: this.handleNodeTap.bind(this) }
            })
            this.setData({ nodes })
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