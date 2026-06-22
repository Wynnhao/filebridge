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
    const { shareCode, title, expiry } = options
    const decodedTitle = decodeURIComponent(title || '文档分享')
    // codeflicker-fix: DESIGN-Issue-004/7k3sz5llqevbucvw3joj — 从页面参数获取真实过期时间
    const expiryText = expiry ? decodeURIComponent(expiry) : '7 天后过期'
    this.setData({
      shareCode,
      title: decodedTitle,
      expiryText,
      shareUrl: `通过马档小程序查看《${decodedTitle}》`,
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
    // 静默递增分享次数
    wx.cloud.callFunction({
      name: 'incrementShare',
      data: { shareCode: this.data.shareCode }
    }).catch(() => {})
    return {
      title: `📄 ${this.data.title} · 马档`,
      path: `/pages/viewer/index?shareCode=${this.data.shareCode}`,
      imageUrl: '/assets/share-cover.png',
    }
  },

  // 分享到朋友圈（需要用户手动操作）
  onShareTimeline() {
    return {
      title: `📄 ${this.data.title} · 马档`,
      query: `shareCode=${this.data.shareCode}`,
    }
  },
})
