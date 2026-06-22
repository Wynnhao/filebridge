/**
 * apis/searchMyDocs.js
 * doc-bridge SKILL 原子接口：搜索/列出我的文档
 * 
 * 按创建时间倒序排列，支持按标题关键词模糊搜索。
 * 自动过滤已过期文档。
 * 仅返回当前用户的文档。
 * 
 * 返回格式遵循微信 AI 原子接口规范：
 * { isError, content, structuredContent, _meta }
 * 
 * // codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur — 直接使用 wx.cloud.database()，消除跨包引用
 * // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk — 增加 _openid 过滤，仅查当前用户文档
 */

/**
 * @param {Object} params - 由小程序 AI 根据 mcp.json inputSchema 注入
 * @param {string} [params.keyword] - 搜索关键词，不传则返回全部
 * @returns {Object} { isError, content, structuredContent, _meta }
 */
async function searchMyDocs(params) {
  const { keyword } = params || {}

  try {
    const openid = (getApp().globalData && getApp().globalData.openid) || 'unknown'
    const db = wx.cloud.database()

    // 直接查询云数据库：当前用户文档（用 {openid} 占位符匹配系统 openid）+ 指南文档（全员可见）
    // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk — _openid 过滤 + isGuide 全员可见
    // 使用 '{openid}' 占位符而非 getApp().globalData.openid，确保与云开发自动写入的 _openid 一致
    const { data } = await db.collection('docs')
      .where(db.command.or([
        { _openid: '{openid}' },
        { isGuide: true }
      ]))
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    let docs = data || []

    // 关键词过滤（模糊匹配标题）
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      docs = docs.filter(doc => {
        const title = (doc.title || '').toLowerCase()
        const filename = (doc.filename || '').toLowerCase()
        return title.includes(kw) || filename.includes(kw)
      })
    }

    // 过滤已过期文档
    const now = new Date()
    docs = docs.filter(doc => {
      if (!doc.expiresAt) return true
      return new Date(doc.expiresAt) > now
    })

    // 按创建时间倒序
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const total = docs.length

    // 事实内容
    let infoText = ''
    if (total === 0) {
      infoText = keyword
        ? `未找到包含"${keyword}"的文档。你可以尝试换个关键词，或上传新文档。`
        : '你还没有上传过任何文档。可以直接在聊天框中发送 .md/.html/.txt 文件，或粘贴文本内容来上传第一篇文档。'
    } else {
      infoText = keyword
        ? `找到 ${total} 篇包含"${keyword}"的文档，按创建时间倒序排列。`
        : `共 ${total} 篇文档，按创建时间倒序排列。`
      if (total > 20) {
        infoText += '仅展示最近 20 篇，可使用关键词搜索更早的文档。'
      }
    }

    return {
      isError: false,
      content: [
        { type: 'text', text: infoText }
      ],
      structuredContent: {
        docs: docs.slice(0, 20).map(doc => ({
          docId: doc._id || '',
          title: doc.title || '未命名文档',
          fileType: doc.fileType || 'md',
          wordCount: doc.wordCount || 0,
          viewCount: doc.viewCount || 0,
          shareCode: doc.shareCode || '',
          createdAt: doc.createdAt || '',
          expiresAt: doc.expiresAt || ''
        })),
        total: total
      },
      _meta: {
        theme: (typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync().theme : 'light')
      }
    }
  } catch (err) {
    console.error('searchMyDocs 原子接口异常:', err)
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `获取文档列表时发生异常：${err.message || '未知错误'}。不要以相同参数重复调用本接口，请引导用户稍后重试。`
      }]
    }
  }
}

module.exports = { searchMyDocs }