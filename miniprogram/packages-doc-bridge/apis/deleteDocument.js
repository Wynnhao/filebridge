/**
 * apis/deleteDocument.js
 * doc-bridge SKILL 原子接口：删除文档
 * 
 * 删除指定的文档，删除后不可恢复。
 * 
 * 返回格式遵循微信 AI 原子接口规范：
 * { isError, content, structuredContent, _meta }
 * 
 * // codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur — 直接调用云函数，消除跨包引用
 * // codeflicker-fix: LOGIC-Issue-3/gimlwacm7df67zl0zjur — fileID 由云函数服务端自动清理
 */

/**
 * @param {Object} params - 由小程序 AI 根据 mcp.json inputSchema 注入
 * @param {string} params.docId - 要删除的文档数据库 ID
 * @returns {Object} { isError, content, structuredContent, _meta }
 */
async function deleteDocument(params) {
  const { docId } = params || {}

  // 校验 docId
  if (!docId || typeof docId !== 'string' || docId.trim().length === 0) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: '需要提供有效的文档 ID 才能删除。请先从文档列表中获取要删除的文档 ID。'
      }]
    }
  }

  try {
    // 直接调用云函数 deleteDoc（服务端自动处理 fileID 清理和权限校验）
    const result = await wx.cloud.callFunction({
      name: 'deleteDoc',
      data: { docId }
    })

    if (result.result.error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `删除文档失败：${result.result.message || result.result.error}。不要以相同参数重复调用本接口，请引导用户稍后重试。`
        }]
      }
    }

    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: '文档已成功删除。分享码已失效，其他用户将无法再通过该分享码查看文档。如需恢复请重新上传。'
        }
      ],
      structuredContent: {
        deleted: true
      },
      _meta: {
        deletedDocId: docId
      }
    }
  } catch (err) {
    console.error('deleteDocument 原子接口异常:', err)
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `删除文档时发生异常：${err.message || '未知错误'}。不要以相同参数重复调用本接口。`
      }]
    }
  }
}

module.exports = { deleteDocument }