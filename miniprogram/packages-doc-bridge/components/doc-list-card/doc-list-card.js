/**
 * components/doc-list-card/doc-list-card.js
 * doc-bridge SKILL 原子组件：文档列表卡片
 * 
 * 展示用户文档列表，每项显示标题、类型、字数、时间。
 * 遵循原子组件约束：固定尺寸、仅 tap 事件、无滚动。
 */

Component({
  properties: {
    // 由原子接口 structuredContent 注入
    docs: {
      type: Array,
      value: [],
      observer: '_onDocsChange'
    },
    total: {
      type: Number,
      value: 0
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
    displayDocs: [],
    isDark: false,
    _viewContext: null
  },

  lifetimes: {
    attached() {
      // codeflicker-fix: COMPAT-Issue-4/gimlwacm7df67zl0zjur — 暗色主题双保险
      this._applyTheme()
      // 获取原子组件视图上下文（含尺寸信息）
      try {
        if (typeof wx !== 'undefined' && wx.modelContext && wx.modelContext.getViewContext) {
          this.data._viewContext = wx.modelContext.getViewContext(this)
        }
      } catch (e) {
        console.warn('获取 viewContext 失败:', e)
      }
    }
  },

  methods: {
    _onDocsChange(newDocs) {
      // 最多展示 5 条（原子组件高度受限 1:1 宽高比）
      this.setData({
        displayDocs: (newDocs || []).slice(0, 5)
      })
    },

    /**
     * 点击文档项 → 上行文本消息，让 AI 展示详情
     */
    onTapDoc(e) {
      const index = e.currentTarget.dataset.index
      const doc = this.data.displayDocs[index]
      if (!doc) return

      try {
        if (typeof wx !== 'undefined' && wx.modelContext && wx.modelContext.getViewContext) {
          const ctx = wx.modelContext.getViewContext(this)
          if (ctx && ctx.sendFollowUpMessage) {
            // 以用户第一人称上行消息
            const msg = doc.shareCode
              ? `查看文档「${doc.title}」的详情（分享码：${doc.shareCode}）`
              : `查看文档「${doc.title}」的详情`
            ctx.sendFollowUpMessage(msg)
          }
        }
      } catch (e) {
        console.warn('sendFollowUpMessage 失败:', e)
      }

      this.triggerEvent('tap', { doc })
    },

    /**
     * codeflicker-fix: COMPAT-Issue-4/gimlwacm7df67zl0zjur
     * 暗色主题双保险：优先读取 properties.theme，其次读取 properties.meta.theme
     */
    _onMetaChange(newMeta) {
      if (newMeta && newMeta.theme) {
        this.setData({ theme: newMeta.theme, isDark: newMeta.theme === 'dark' })
      }
    },

    _applyTheme() {
      let theme = this.properties.theme || 'light'
      if (this.properties.meta && this.properties.meta.theme) {
        theme = this.properties.meta.theme
      }
      this.setData({ theme: theme, isDark: theme === 'dark' })
    }
  }
})