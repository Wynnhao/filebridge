/**
 * apis/getDocumentInfo.js
 * doc-bridge SKILL 原子接口：获取文档详情
 * 
 * 通过 shareCode 或 docId 获取文档的详细信息。
 * 
 * 返回格式遵循微信 AI 原子接口规范：
 * { isError, content, structuredContent, _meta }
 * 
 * // codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur — 直接使用 wx.cloud.database()/callFunction()，消除跨包引用
 */

const { formatExpiry } = require('../utils/helper')

/**
 * @param {Object} params - 由小程序 AI 根据 mcp.json inputSchema 注入
 * @param {string} [params.shareCode] - 文档分享码（优先使用）
 * @param {string} [params.docId] - 文档数据库 ID
 * @returns {Object} { isError, content, structuredContent, _meta }
 */
async function getDocumentInfo(params) {
  const { shareCode, docId } = params || {}

  // 校验：至少需要一个标识
  if (!shareCode && !docId) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: '需要提供文档的分享码或文档 ID 才能查询。请先从文档列表中获取。'
      }]
    }
  }

  try {
    // 优先通过 shareCode 查询（复用现有云函数 getDocContent）
    if (shareCode) {
      const result = await wx.cloud.callFunction({
        name: 'getDocContent',
        data: { shareCode },
      })

      if (result.result.error) {
        if (result.result.error === 'EXPIRED') {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `分享码 ${shareCode} 对应的文档已过期。过期文档无法查看，请重新上传。不要以相同分享码重复调用本接口。`
            }]
          }
        }
        if (result.result.error === 'NOT_FOUND') {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `未找到分享码为 ${shareCode} 的文档。请检查分享码是否正确，或尝试从文档列表中查找。不要以相同分享码重复调用本接口。`
            }]
          }
        }
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `获取文档详情失败：${result.result.error || '网络错误'}。不要以相同参数重复调用本接口。`
          }]
        }
      }

      const doc = result.result

      // 检查过期
      if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `分享码 ${shareCode} 对应的文档已过期。过期文档无法查看，请重新上传。不要以相同分享码重复调用本接口。`
          }]
        }
      }

      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: `文档「${doc.title}」详情：${doc.fileType || 'md'} 格式，${doc.wordCount || 0} 字，已被查看 ${doc.viewCount || 0} 次，${formatExpiry(doc.expiresAt)}。分享码：${shareCode}。`
          }
        ],
        structuredContent: {
          title: doc.title || '未命名文档',
          fileType: doc.fileType || 'md',
          wordCount: doc.wordCount || 0,
          viewCount: doc.viewCount || 0,
          shareCode: shareCode,
          createdAt: doc.createdAt || '',
          expiresAt: doc.expiresAt || ''
        },
        _meta: {
          shareCode: shareCode,
          theme: (typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync().theme : 'light')
        }
      }
    }

    // 通过 docId 查询：直接查数据库
    if (docId) {
      const db = wx.cloud.database()
      const { data: doc } = await db.collection('docs').doc(docId).get()

      if (!doc) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `未找到 ID 为 ${docId} 的文档。该文档可能已被删除或过期。不要以相同参数重复调用本接口。`
          }]
        }
      }

      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: `文档「${doc.title}」详情：${doc.fileType || 'md'} 格式，${doc.wordCount || 0} 字，已被查看 ${doc.viewCount || 0} 次，${formatExpiry(doc.expiresAt)}。分享码：${doc.shareCode || '无'}。`
          }
        ],
        structuredContent: {
          title: doc.title || '未命名文档',
          fileType: doc.fileType || 'md',
          wordCount: doc.wordCount || 0,
          viewCount: doc.viewCount || 0,
          shareCode: doc.shareCode || '',
          createdAt: doc.createdAt || '',
          expiresAt: doc.expiresAt || ''
        },
        _meta: {
          docId: docId,
          shareCode: doc.shareCode || '',
          theme: (typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync().theme : 'light')
        }
      }
    }
  } catch (err) {
    console.error('getDocumentInfo 原子接口异常:', err)
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `获取文档详情时发生异常：${err.message || '未知错误'}。不要以相同参数重复调用本接口。`
      }]
    }
  }
}

module.exports = { getDocumentInfo }