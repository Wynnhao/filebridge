// pages/index/index.js
const { getMyDocs, uploadDoc, getDocContent, deleteDoc } = require('../../utils/cloud')
const { formatRelativeTime, formatExpiry } = require('../../utils/helper')

Page({
  data: {
    docs: [],
    filteredDocs: [],
    searchKeyword: '',
    loading: false,
    uploading: false,
    uploadProgress: 0,
    expiryDays: 7,        // 文档有效期（天）
    showExpiryPicker: false,
    codeInput: '',        // 按编码获取文档 - 输入框内容
    codeSearching: false, // 按编码查询中
    showPasteModal: false, // 粘贴上传弹窗
    pasteContent: '',      // 粘贴的文档内容
    pasteFilename: 'document.md', // 粘贴的文件名
    theme: 'light',        // codeflicker-fix: THEME-Issue-001/chudbvwsbhsz7kn7hanw
  },

  onLoad() {
    // 同步读取持久化主题
    const app = getApp()
    this.setData({ theme: app.loadTheme() })
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
        // 置顶优先
        docs.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return 0
        })
        this.setData({ docs, filteredDocs: docs, loading: false })
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
    // codeflicker-fix: LOGIC-Issue-003/chudbvwsbhsz7kn7hanw — 补 TXT 类型检测
    if (content.trim().startsWith('<!') || content.trim().startsWith('<html') || content.trim().startsWith('<HTML')) {
      if (!this.data.pasteFilename.endsWith('.html')) {
        const name = this.data.pasteFilename.replace(/\.\w+$/, '') + '.html'
        this.setData({ pasteFilename: name })
      }
    } else if (content.trim().startsWith('#') || content.trim().startsWith('```') || content.includes('\n') && (content.includes('##') || content.includes('*'))) {
      // 有明显 Markdown 特征：以 # 或 ``` 开头，或多行且含 ##、* 等语法
      if (!this.data.pasteFilename.endsWith('.md')) {
        const name = this.data.pasteFilename.replace(/\.\w+$/, '') + '.md'
        this.setData({ pasteFilename: name })
      }
    } else {
      // 纯文本，没有 Markdown/HTML 特征 → 推断为 .txt
      if (!this.data.pasteFilename.endsWith('.txt')) {
        const name = this.data.pasteFilename.replace(/\.\w+$/, '') + '.txt'
        this.setData({ pasteFilename: name })
      }
    }
  },

  // 文件名输入
  handlePasteFilenameInput(e) {
    this.setData({ pasteFilename: e.detail.value })
  },

  // 确认粘贴上传
  // codeflicker-fix: EDGE-Issue-002/7k3sz5llqevbucvw3joj — 文件写入失败时兜底处理
  async handleConfirmPasteUpload() {
    const content = this.data.pasteContent.trim()
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' })
      return
    }
    const filename = this.data.pasteFilename.trim() || 'document.md'
    const fs = wx.getFileSystemManager()
    const tempPath = `${wx.env.USER_DATA_PATH}/${filename}`
    let uploadPath = ''
    try {
      fs.writeFileSync(tempPath, content, 'utf8')
      uploadPath = tempPath
    } catch (e) {
      // 写入失败：尝试使用随机文件名避免冲突
      try {
        const altPath = `${wx.env.USER_DATA_PATH}/${Date.now()}_${filename}`
        fs.writeFileSync(altPath, content, 'utf8')
        uploadPath = altPath
      } catch (e2) {
        // 仍然失败：不传 filePath，uploadDoc 内部会只用 content 创建文档
        uploadPath = ''
      }
    }
    this.setData({ showPasteModal: false })
    await this.doUpload(uploadPath, content, filename)
  },

  // 从微信聊天选取文件
  async handleChooseFile() {
    try {
      const res = await wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['md', 'html', 'txt'],
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

  // 从本地选取文件（引导用户通过「文件传输助手」从聊天选取）
  // 注意：wx.chooseFile 仅在模拟器中可用，真机上不支持直接选取本地文件
  // 微信小程序唯一可用的文件选取 API 是 wx.chooseMessageFile（从聊天记录选取）
  // 用户可以先将文件发送到「文件传输助手」，再通过此功能选取
  async handleChooseLocalFile() {
    wx.showModal({
      title: '选取本地文件',
      content: '微信小程序暂不支持直接选取手机本地文件。请先将文件发送到微信「文件传输助手」，然后从聊天记录中选取。点击「知道了」将跳转到聊天文件选取。',
      confirmText: '知道了',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          // 降级为从聊天选取
          try {
            const result = await wx.chooseMessageFile({
              count: 1,
              type: 'file',
              extension: ['md', 'html', 'txt'],
            })
            const file = result.tempFiles[0]
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
        }
      },
    })
  },

  // 执行上传
  async doUpload(filePath, content, filename) {
    this.setData({ uploading: true, uploadProgress: 0 })
    wx.showLoading({ title: '上传中...', mask: true })

    const { success, data, error } = await uploadDoc(filePath, content, filename, this.data.expiryDays)

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
            // codeflicker-fix: MAINT-Issue-009/chudbvwsbhsz7kn7hanw — 移除无效 _loadingFlag
            // 强制刷新列表（forceRefresh=true 绕过 loading 守卫）
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

  // 搜索输入
  handleSearchInput(e) {
    const kw = e.detail.value.trim().toLowerCase()
    if (!kw) {
      this.setData({ searchKeyword: '', filteredDocs: this.data.docs })
      return
    }
    const filtered = this.data.docs.filter(doc =>
      (doc.title || '').toLowerCase().includes(kw) ||
      (doc.shareCode || '').toLowerCase().includes(kw)
    )
    this.setData({ searchKeyword: kw, filteredDocs: filtered })
  },

  // 清除搜索
  handleClearSearch() {
    this.setData({ searchKeyword: '', filteredDocs: this.data.docs })
  },

  // 展开/折叠有效期选择器
  toggleExpiryPicker() {
    this.setData({ showExpiryPicker: !this.data.showExpiryPicker })
  },

  // 选择有效期
  selectExpiry(e) {
    this.setData({
      expiryDays: parseInt(e.currentTarget.dataset.days),
      showExpiryPicker: false,
    })
  },

  // 切换置顶
  async handleTogglePin(e) {
    const { id, pinned } = e.currentTarget.dataset
    wx.showLoading({ title: pinned ? '取消置顶...' : '置顶中...', mask: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'pinDoc',
        data: { docId: id, pinned: !pinned }
      })
      wx.hideLoading()
      if (res.result && res.result.success) {
        wx.showToast({ title: pinned ? '已取消置顶' : '已置顶', icon: 'success' })
        this.loadDocs(true)
      } else {
        wx.showToast({ title: '操作失败，请重试', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDocs().then(() => wx.stopPullDownRefresh())
  },

  // 切换首页主题
  // codeflicker-fix: THEME-Issue-001/chudbvwsbhsz7kn7hanw
  toggleIndexTheme() {
    const app = getApp()
    const next = app.toggleTheme()
    this.setData({ theme: next })
  },
})