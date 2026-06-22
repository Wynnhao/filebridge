/**
 * apis/uploadDocument.js
 * doc-bridge SKILL 原子接口：上传文档
 * 
 * 支持两种上传方式：
 * 1. 多模态文件上传（AI 聊天框发送文件）
 * 2. 文本粘贴上传（content 字段）
 * 
 * 返回格式遵循微信 AI 原子接口规范：
 * { isError, content, structuredContent, _meta }
 * 
 * // codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur — 使用本地 utils 和直接 wx.cloud API，消除跨包引用
 * // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk — 内容 SHA256 去重：同用户同内容复用已有 shareCode
 */

const { extractTitle, countWords, formatExpiry, generateShareCode } = require('../utils/helper')
const { computeHash } = require('../utils/crypto')

/**
 * @param {Object} params - 由小程序 AI 根据 mcp.json inputSchema 注入
 * @param {string} [params.content] - 粘贴的文本内容
 * @param {Object} [params.file] - 多模态上传的文件对象（AI 自动注入）
 * @param {string} [params.filename] - 文件名
 * @param {number} [params.expiryDays] - 有效期天数
 * @returns {Object} { isError, content, structuredContent, _meta }
 */
async function uploadDocument(params) {
  const { content, file, filename, expiryDays } = params || {}

  try {
    let finalContent = content || ''
    let finalFilename = filename || '粘贴文本'
    let filePath = ''

    // 方式一：多模态文件上传
    if (file) {
      // file 是由小程序 AI 注入的文件对象，包含临时路径和文件名
      filePath = file.path || file.tempFilePath || ''
      finalFilename = file.name || filename || '未命名文档'

      // 需要读取文件内容
      if (filePath && !finalContent) {
        try {
          const fs = wx.getFileSystemManager()
          finalContent = fs.readFileSync(filePath, 'utf-8')
        } catch (readErr) {
          console.error('读取上传文件失败:', readErr)
          return {
            isError: true,
            content: [{
              type: 'text',
              text: '无法读取上传的文件内容，请确认文件格式正确（支持 .md / .html / .txt），或尝试粘贴文本内容。'
            }]
          }
        }
      }
    }

    // 校验内容不为空
    if (!finalContent || finalContent.trim().length === 0) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: '文档内容为空，请发送包含文本内容的文件，或直接粘贴 Markdown/HTML/纯文本内容。'
        }]
      }
    }

    // 自动识别文件类型
    if (!finalFilename.includes('.')) {
      const lower = finalContent.trim().toLowerCase()
      if (lower.startsWith('<!doctype') || lower.startsWith('<html') || lower.startsWith('<!')) {
        finalFilename += '.html'
      } else if (lower.startsWith('#') || lower.startsWith('```') || 
                 (lower.includes('\n') && (lower.includes('##') || lower.includes('*')))) {
        finalFilename += '.md'
      } else {
        finalFilename += '.txt'
      }
    }

    // 确定文件类型
    let fileType = 'md'
    if (finalFilename.endsWith('.html') || finalFilename.endsWith('.htm')) fileType = 'html'
    else if (finalFilename.endsWith('.txt')) fileType = 'txt'

    // --- 直接使用 wx.cloud API，无需依赖主包 cloud.js ---

    const openid = (getApp().globalData && getApp().globalData.openid) || 'unknown'
    const db = wx.cloud.database()

    // --- 内容去重检查：同一用户、同一内容、未过期的文档 ---
    // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk
    const contentHash = computeHash(finalContent)

    try {
      const { data: existingDocs } = await db.collection('docs')
        .where({
          _openid: openid,
          contentHash: contentHash
        })
        .limit(1)
        .get()

      if (existingDocs && existingDocs.length > 0) {
        const existingDoc = existingDocs[0]
        // 检查是否已过期：过期文档不应复用
        const now = new Date()
        const isExpired = existingDoc.expiresAt && new Date(existingDoc.expiresAt) <= now

        if (!isExpired) {
          // 命中已有有效文档，直接返回，不创建新记录
          return {
            isError: false,
            content: [
              {
                type: 'text',
                text: `这篇文档你已经上传过了，分享码是「${existingDoc.shareCode}」，${formatExpiry(existingDoc.expiresAt)}。可直接将分享码发送给微信好友查看文档，无需重复上传。`
              }
            ],
            structuredContent: {
              title: existingDoc.title || '未命名文档',
              fileType: existingDoc.fileType || 'md',
              wordCount: existingDoc.wordCount || 0,
              shareCode: existingDoc.shareCode,
              createdAt: existingDoc.createdAt || '',
              expiresAt: existingDoc.expiresAt || '',
              viewCount: existingDoc.viewCount || 0,
              docId: existingDoc._id || ''
            },
            _meta: {
              docId: existingDoc._id || '',
              shareCode: existingDoc.shareCode,
              theme: (wx.getSystemInfoSync().theme || 'light'),
              existed: true
            }
          }
        }
        // 已过期：不参与去重，继续正常上传流程
      }
    } catch (lookupErr) {
      // contentHash 字段可能尚不存在（存量数据），查不到不应阻塞上传
      console.warn('内容去重查询失败（可能 contentHash 字段未建索引），降级为正常上传:', lookupErr)
    }

    // --- 去重未命中，正常创建新记录 ---

    // 碰撞检测：重试最多 3 次
    let shareCode = generateShareCode()
    for (let attempts = 0; attempts < 3; attempts++) {
      const { data } = await db.collection('docs').where({ shareCode }).get()
      if (data.length === 0) break
      shareCode = generateShareCode()
    }

    // 1. 上传文件到云存储（仅当 filePath 有效时）
    let fileID = ''
    if (filePath) {
      try {
        const cloudPath = `docs/${openid}/${shareCode}_${finalFilename}`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath })
        fileID = uploadRes.fileID
      } catch (uploadErr) {
        console.warn('云存储上传失败，降级为仅存文本内容:', uploadErr)
        // 上传失败不阻塞流程，降级为仅存 content
      }
    }

    // 2. 写入元数据到云数据库
    const title = extractTitle(finalContent, finalFilename)
    const wordCount = countWords(finalContent)
    const effectiveExpiryDays = expiryDays || 7

    const docData = {
      shareCode,
      fileID,
      title,
      filename: finalFilename,
      fileType,
      wordCount,
      viewCount: 0,
      contentHash,  // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk
      createdAt: db.serverDate(),
      expiresAt: db.serverDate({ offset: effectiveExpiryDays * 86400000 }),
      isPublic: true,
    }
    // 粘贴上传无文件路径时，直接将内容存入数据库
    if (!fileID) {
      docData.content = finalContent.slice(0, 500000)
    }
    const addRes = await db.collection('docs').add({ data: docData })

    // 事实内容
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: `文档「${title}」上传成功。${fileType} 格式，共 ${wordCount} 字，${formatExpiry(docData.expiresAt)}。分享码：${shareCode}。可将分享码发送给微信好友查看文档。`
        }
      ],
      structuredContent: {
        title: title,
        fileType: fileType,
        wordCount: wordCount,
        shareCode: shareCode,
        createdAt: new Date().toISOString(),
        expiresAt: docData.expiresAt,
        viewCount: 0,
        docId: addRes._id || ''
      },
      _meta: {
        docId: addRes._id || '',
        shareCode: shareCode,
        theme: (wx.getSystemInfoSync().theme || 'light')
      }
    }
  } catch (err) {
    console.error('uploadDocument 原子接口异常:', err)
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `文档上传时发生异常：${err.message || '未知错误'}。不要以相同内容重复调用本接口，请引导用户稍后重试。`
      }]
    }
  }
}

module.exports = { uploadDocument }