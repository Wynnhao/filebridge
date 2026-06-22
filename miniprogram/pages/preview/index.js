// pages/preview/index.js
// 文档预览页 — 文档所有者查看（可分享）
// codeflicker-fix: REFACTOR-Issue-001/axj1q4pib9s0gmuphu0d — 使用 docRenderer Behavior 共享渲染逻辑

const docRenderer = require('../../behaviors/docRenderer')

Page({
  behaviors: [docRenderer],

  onLoad(options) {
    const { shareCode, title, isNew } = options
    this.setData({
      shareCode,
      title: decodeURIComponent(title || '文档预览'),
    })
    this.initTowxml()
    wx.setNavigationBarTitle({ title: decodeURIComponent(title || '文档预览') })

    // 刚上传的新文档 → 从 app.tempDocContent 拿内容（避免重新下载）
    const app = getApp()
    if (isNew && app.tempDocContent) {
      const content = app.tempDocContent
      app.tempDocContent = null
      this.renderContent(content, 'md')
    } else {
      this.loadContent(shareCode)
    }
  },

  // 跳转分享页
  handleShare() {
    wx.navigateTo({
      url: `/pages/share/index?shareCode=${this.data.shareCode}&title=${encodeURIComponent(this.data.title)}&expiry=${encodeURIComponent(this.data.expiryText)}`,
    })
  },

  // 顶部分享按钮
  onShareAppMessage() {
    // 静默递增分享次数
    // codeflicker-fix: LOGIC-Issue-004/chudbvwsbhsz7kn7hanw
    wx.cloud.callFunction({
      name: 'incrementShare',
      data: { shareCode: this.data.shareCode }
    }).catch(() => {})
    return {
      title: this.data.title,
      path: `/pages/viewer/index?shareCode=${this.data.shareCode}`,
    }
  },
})