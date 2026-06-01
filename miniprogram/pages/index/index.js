// pages/index/index.js
const { getMyDocs, uploadDoc, getDocContent, deleteDoc } = require('../../utils/cloud')
const { formatRelativeTime, formatExpiry } = require('../../utils/helper')

Page({
  data: {
    docs: [],
    loading: false,
    uploading: false,
    uploadProgress: 0,
    codeInput: '',        // 按编码获取文档 - 输入框内容
    codeSearching: false, // 按编码查询中
    showPasteModal: false, // 粘贴上传弹窗
    pasteContent: '',      // 粘贴的文档内容
    pasteFilename: 'document.md', // 粘贴的文件名
  },

  onLoad() {
    // 不立即加载，避免阻塞页面初始化导致 timeout
  },

  onShow() {
    // 延迟 500ms 加载文档列表，确保页面先完成渲染
    if (this._loadTimer) clearTimeout(this._loadTimer)
    this._loadTimer = setTimeout(() => {
      this.loadDocs()
    }, 500)
  },

  onHide() {
    if (this._loadTimer) clearTimeout(this._loadTimer)
  },

  // 加载文档列表
  async loadDocs(forceRefresh) {
    if (!forceRefresh && this.data.loading) return  // 防止重复加载（除非强制刷新）
    this.setData({ loading: true })
    try {
      const { success, data } = await getMyDocs()
      if (success) {
        const docs = data.map(doc => ({
          ...doc,
          relativeTime: formatRelativeTime(doc.createdAt),
          expiryText: formatExpiry(doc.expiresAt),
        }))
        this.setData({ docs, loading: false })
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('loadDocs error:', err)
      this.setData({ loading: false })
    }
  },

  // 打开粘贴上传弹窗
  handlePasteUpload() {
    this.setData({ showPasteModal: true, pasteContent: '', pasteFilename: 'document.md' })
  },

  // 关闭粘贴上传弹窗
  handleClosePasteModal() {
    this.setData({ showPasteModal: false })
  },

  // 粘贴内容输入
  handlePasteInput(e) {
    this.setData({ pasteContent: e.detail.value })
    // 自动推断文件名后缀
    const content = e.detail.value
    if (content.trim().startsWith('<!') || content.trim().startsWith('<html') || content.trim().startsWith('<HTML')) {
      if (!this.data.pasteFilename.endsWith('.html')) {
        const name = this.data.pasteFilename.replace(/\.\w+$/, '') + '.html'
        this.setData({ pasteFilename: name })
      }
    } else if (!this.data.pasteFilename.endsWith('.md')) {
      const name = this.data.pasteFilename.replace(/\.\w+$/, '') + '.md'
      this.setData({ pasteFilename: name })
    }
  },

  // 文件名输入
  handlePasteFilenameInput(e) {
    this.setData({ pasteFilename: e.detail.value })
  },

  // 确认粘贴上传
  async handleConfirmPasteUpload() {
    const content = this.data.pasteContent.trim()
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' })
      return
    }
    const filename = this.data.pasteFilename.trim() || 'document.md'
    const fs = wx.getFileSystemManager()
    const tempPath = `${wx.env.USER_DATA_PATH}/${filename}`
    try {
      fs.writeFileSync(tempPath, content, 'utf8')
    } catch (e) {
      // 写入失败时直接用内容上传
    }
    this.setData({ showPasteModal: false })
    await this.doUpload(tempPath, content, filename)
  },

  // 从微信聊天选取文件
  async handleChooseFile() {
    try {
      const res = await wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['md', 'html'],
      })
      const file = res.tempFiles[0]
      const fs = wx.getFileSystemManager()
      let content
      try {
        content = fs.readFileSync(file.path, 'utf-8')
      } catch (e) {
        wx.showToast({ title: '文件读取失败，请重试', icon: 'none' })
        return
      }
      await this.doUpload(file.path, content, file.name)
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('cancel')) return
      wx.showToast({ title: '选取文件失败', icon: 'none' })
    }
  },

  // 从本地选取文件
  async handleChooseLocalFile() {
    // 优先尝试 wx.chooseFile（部分安卓机型支持）
    // 不支持时降级为 wx.chooseMessageFile（从聊天记录选取）
    try {
      if (wx.chooseFile) {
        const res = await wx.chooseFile({
          count: 1,
          type: 'file',
          extension: ['md', 'html'],
        })
        const file = res.tempFiles[0]
        const fs = wx.getFileSystemManager()
        let content
        try {
          content = fs.readFileSync(file.path, 'utf-8')
        } catch (e) {
          wx.showToast({ title: '文件读取失败，请重试', icon: 'none' })
          return
        }
        await this.doUpload(file.path, content, file.name)
      } else {
        // API 不存在时提示用户使用其他方式
        wx.showToast({ title: '当前机型不支持本地选取，请用聊天或粘贴方式', icon: 'none', duration: 3000 })
      }
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('cancel')) return
      // chooseFile 失败时降级为聊天选取
      wx.showToast({ title: '本地选取不可用，请用聊天或粘贴方式上传', icon: 'none', duration: 3000 })
    }
  },

  // 执行上传
  async doUpload(filePath, content, filename) {
    this.setData({ uploading: true, uploadProgress: 0 })
    wx.showLoading({ title: '上传中...', mask: true })

    const { success, data, error } = await uploadDoc(filePath, content, filename)

    wx.hideLoading()
    this.setData({ uploading: false })

    if (!success) {
      wx.showToast({ title: '上传失败：' + (error || '未知错误'), icon: 'none' })
      return
    }

    // 上传成功 → 跳转预览页
    const app = getApp()
    app.tempDocContent = content  // 临时存储内容，避免重新下载
    wx.navigateTo({
      url: `/pages/preview/index?shareCode=${data.shareCode}&title=${encodeURIComponent(data.title)}&isNew=1`,
    })

    // 刷新列表
    this.loadDocs()
  },

  // 点击文档列表项 → 跳转预览
  handleDocTap(e) {
    const { sharecode, title } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/preview/index?shareCode=${sharecode}&title=${encodeURIComponent(title)}`,
    })
  },

  // 点击删除按钮 → 弹窗确认后删除
  handleDeleteDoc(e) {
    const { id, sharecode, title, isguide } = e.currentTarget.dataset
    // 指南文档不允许删除
    if (isguide) {
      wx.showToast({ title: '使用指南不能删除', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除文档',
      content: `确定删除「${title}」吗？删除后其他人将无法通过编码 ${sharecode} 查看此文档。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true })
          const { success } = await deleteDoc(id)
          wx.hideLoading()
          if (success) {
            wx.showToast({ title: '已删除', icon: 'success' })
            // 重置 loading 标志以允许重新加载列表
            this._loadingFlag = false
            // 强制刷新列表（删除后需要重新加载）
            this.loadDocs(true)
          } else {
            wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      },
    })
  },

  // 编码输入框变化
  handleCodeInput(e) {
    this.setData({ codeInput: e.detail.value })
  },

  // 从剪贴板粘贴编码
  handlePasteCode() {
    wx.getClipboardData({
      success: (res) => {
        const text = (res.data || '').trim()
        if (!text) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' })
          return
        }
        const code = text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
        if (!code) {
          wx.showToast({ title: '剪贴板内容不含有效编码', icon: 'none' })
          return
        }
        this.setData({ codeInput: code })
        wx.showToast({ title: '已粘贴', icon: 'success', duration: 1000 })
      },
      fail: () => {
        wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
      },
    })
  },

  // 按编码获取文档
  async handleGetByCode() {
    const code = (this.data.codeInput || '').trim()
    if (!code) {
      wx.showToast({ title: '请输入文档编码', icon: 'none' })
      return
    }
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      wx.showToast({ title: '编码只能包含英文和数字', icon: 'none' })
      return
    }

    this.setData({ codeSearching: true })
    wx.showLoading({ title: '查找中...', mask: true })

    const { success, data, error } = await getDocContent(code)

    wx.hideLoading()
    this.setData({ codeSearching: false })

    if (!success) {
      let toastTitle = '未找到该文档，请检查编码'
      if (error === 'EXPIRED') {
        toastTitle = '该文档已过期，无法查看'
      } else if (error === 'NETWORK_ERROR') {
        toastTitle = '网络异常，请重试'
      }
      wx.showToast({ title: toastTitle, icon: 'none', duration: 2500 })
      return
    }

    // 跳转预览页
    wx.navigateTo({
      url: `/pages/viewer/index?shareCode=${code}&title=${encodeURIComponent(data.title || '文档预览')}`,
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDocs().then(() => wx.stopPullDownRefresh())
  },
})