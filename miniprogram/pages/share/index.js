// pages/share/index.js
const { formatExpiry } = require('../../utils/helper')

Page({
  data: {
    shareCode: '',
    title: '',
    expiryText: '',
    shareUrl: '',
    codeCopied: false,
  },

  onLoad(options) {
    const { shareCode, title } = options
    const decodedTitle = decodeURIComponent(title || '文档分享')
    this.setData({
      shareCode,
      title: decodedTitle,
      expiryText: '7 天后过期',
      shareUrl: `通过飞文小程序查看《${decodedTitle}》`,
    })
    wx.setNavigationBarTitle({ title: '分享文档' })
  },

  // 复制文档编码
  handleCopyCode() {
    const code = this.data.shareCode
    if (!code) return
    wx.setClipboardData({
      data: code,
      success: () => {
        this.setData({ codeCopied: true })
        setTimeout(() => this.setData({ codeCopied: false }), 2000)
      },
    })
  },

  // 微信原生转发（发给朋友/群）
  onShareAppMessage() {
    return {
      title: `📄 ${this.data.title} · 飞文`,
      path: `/pages/viewer/index?shareCode=${this.data.shareCode}`,
      imageUrl: '/assets/share-cover.png',
    }
  },

  // 分享到朋友圈（需要用户手动操作）
  onShareTimeline() {
    return {
      title: `📄 ${this.data.title} · 飞文`,
      query: `shareCode=${this.data.shareCode}`,
    }
  },
})
