/**
 * components/doc-detail-card/doc-detail-card.js
 * doc-bridge SKILL 原子组件：文档详情卡片
 * 
 * 展示单个文档的详细信息，包括分享码、类型、字数、访问次数、有效期等。
 * 遵循原子组件约束：固定尺寸、仅 tap 事件、无滚动。
 */

// codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur — 使用分包内本地 helper，消除跨包引用
const { formatExpiry } = require('../../utils/helper')

Component({
  properties: {
    // 由原子接口 structuredContent 注入
    title: {
      type: String,
      value: '未命名文档'
    },
    fileType: {
      type: String,
      value: 'md'
    },
    wordCount: {
      type: Number,
      value: 0
    },
    viewCount: {
      type: Number,
      value: 0
    },
    shareCode: {
      type: String,
      value: ''
    },
    createdAt: {
      type: String,
      value: ''
    },
    expiresAt: {
      type: String,
      value: ''
    },
    // codeflicker-fix: COMPAT-Issue-4/gimlwacm7df67zl0zjur — _meta 传入的主题信息兜底
    meta: {
      type: Object,
      value: {},
      observer: '_onMetaChange'
    },
    theme: {
      type: String,
      value: 'light'
    }
  },

  data: {
    expiryText: '',
    typeLabel: '',
    isDark: false,
    _viewContext: null
  },

  lifetimes: {
    attached() {
      // 格式化过期文案
      this.setData({
        expiryText: formatExpiry(this.properties.expiresAt),
        typeLabel: this.properties.fileType === 'md' ? 'Markdown' : 
                   this.properties.fileType === 'html' ? 'HTML' : '纯文本'
      })

      // codeflicker-fix: COMPAT-Issue-4/gimlwacm7df67zl0zjur — 暗色主题双保险
      this._applyTheme()

      // 获取原子组件视图上下文
      try {
        if (typeof wx !== 'undefined' && wx.modelContext && wx.modelContext.getViewContext) {
          this.data._viewContext = wx.modelContext.getViewContext(this)
          
          // 动态设置关联页面的 query 参数
          const ctx = this.data._viewContext
          if (ctx && ctx.setPageQuery && this.properties.shareCode) {
            ctx.setPageQuery({
              shareCode: this.properties.shareCode
            })
          }
        }
      } catch (e) {
        console.warn('获取 viewContext 失败:', e)
      }
    }
  },

  methods: {
    /**
     * 点击卡片 → 打开半屏预览页面
     */
    onTapCard() {
      try {
        if (typeof wx !== 'undefined' && wx.modelContext && wx.modelContext.getViewContext) {
          const ctx = wx.modelContext.getViewContext(this)
          if (ctx && ctx.openDetailPage) {
            ctx.openDetailPage({
              url: `/pages/share/index?shareCode=${this.properties.shareCode}`
            })
          }
        }
      } catch (e) {
        console.warn('openDetailPage 失败:', e)
      }

      this.triggerEvent('tap')
    },

    /**
     * 复制分享码 → 上行文本消息
     */
    onCopyShareCode() {
      const code = this.properties.shareCode
      if (!code) return

      try {
        if (typeof wx !== 'undefined' && wx.modelContext && wx.modelContext.getViewContext) {
          const ctx = wx.modelContext.getViewContext(this)
          if (ctx && ctx.sendFollowUpMessage) {
            ctx.sendFollowUpMessage(`复制了文档分享码：${code}`)
          }
        }
      } catch (e) {
        console.warn('sendFollowUpMessage 失败:', e)
      }
    },

    /**
     * codeflicker-fix: COMPAT-Issue-4/gimlwacm7df67zl0zjur
     * 暗色主题双保险：优先读取 properties.theme，其次读取 properties.meta.theme
     * @media 查询作为首选方案（CSS 层面），此方法作为兜底（JS 层面）
     */
    _onMetaChange(newMeta) {
      if (newMeta && newMeta.theme) {
        this.setData({ theme: newMeta.theme, isDark: newMeta.theme === 'dark' })
      }
    },

    _applyTheme() {
      // 优先级：properties.theme > properties.meta.theme > 默认 light
      let theme = this.properties.theme || 'light'
      if (this.properties.meta && this.properties.meta.theme) {
        theme = this.properties.meta.theme
      }
      this.setData({ theme: theme, isDark: theme === 'dark' })
    }
  }
})