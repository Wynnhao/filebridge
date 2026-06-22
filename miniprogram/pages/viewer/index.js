// pages/viewer/index.js
// 接收端查看页 — 分享者发出卡片 → 接收者扫码 → 进入此页
// codeflicker-fix: REFACTOR-Issue-001/axj1q4pib9s0gmuphu0d — 使用 docRenderer Behavior 共享渲染逻辑

const docRenderer = require('../../behaviors/docRenderer')
const { getDocContent } = require('../../utils/cloud')  // codeflicker-fix: LOGIC-Issue-003/7k3sz5llqevbucvw3joj
const { formatExpiry } = require('../../utils/helper')

Page({
  behaviors: [docRenderer],

  data: {
    docContent: '',    // 原始内容缓存，用于保存到本地
    docFilename: '',   // 文件名，用于保存
  },

  onLoad(options) {
    const shareCode = options.shareCode || options.scene
    if (!shareCode) {
      this.setData({ loading: false, error: 'NOT_FOUND' })
      return
    }
    this.setData({ shareCode })
    this.initTowxml()
    this.loadContent(shareCode)
  },

  // loadContent 增强版：额外缓存原始内容和文件名
  async loadContent(shareCode) {
    this.setData({ loading: true, error: null })
    const { success, data, error } = await getDocContent(shareCode)

    if (!success) {
      this.setData({ loading: false, error: error || 'UNKNOWN' })
      return
    }

    const fileType = data.fileType || 'md'
    const filename = data.filename || (data.title || 'document') + '.' + fileType
    this.setData({
      title: data.title || '未命名文档',
      fileType,
      wordCount: data.wordCount || 0,
      viewCount: data.viewCount || 0,
      expiryText: formatExpiry(data.expiresAt),
      hasExternalStyle: fileType === 'html' && /<style[\s\S]*?>/i.test(data.content),
      docContent: data.content,
      docFilename: filename,
    })
    wx.setNavigationBarTitle({ title: data.title || '文档预览' })
    this.renderContent(data.content, fileType)
  },

  // 保存文档到本地
  handleSaveFile() {
    const { docContent, docFilename, title } = this.data
    if (!docContent) {
      wx.showToast({ title: '文档内容为空', icon: 'none' })
      return
    }
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${docFilename}`
    try {
      fs.writeFileSync(filePath, docContent, 'utf8')
      wx.openDocument({
        filePath,
        showMenu: true,
        success: () => {},
        fail: (err) => {
          wx.setClipboardData({
            data: docContent,
            success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' }),
          })
        }
      })
    } catch (err) {
      console.error('save error:', err)
      wx.setClipboardData({
        data: docContent,
        success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' }),
      })
    }
  },

  // 接收者也可以继续转发
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