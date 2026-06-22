/**
 * utils/cloud.js
 * 云开发接口封装（测试阶段使用 mock，正式接入后替换实现）
 * // codeflicker-fix: MAINT-Issue-008/2sfzcykvrat5gct6j21b
 */

const { MOCK_DOCS, GUIDE_MD_CONTENT } = require('./mock')
const { generateShareCode, extractTitle, countWords } = require('./helper')
const { computeHash } = require('./crypto')

// 是否使用 mock 数据（直接读取模块变量，避免依赖 getApp）
const USE_MOCK = false

function isMockMode() {
  return USE_MOCK
}

/**
 * 获取我的文档列表
 * // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk — 增加 _openid 过滤，仅查当前用户文档
 */
async function getMyDocs() {
  if (isMockMode()) {
    return { success: true, data: MOCK_DOCS }
  }
  try {
    const app = getApp()
    const openid = app.globalData.openid || 'unknown'
    const db = wx.cloud.database()
    const { data } = await db.collection('docs')
      .where(db.command.or([
        { _openid: '{openid}' },
        { isGuide: true }
      ]))
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    return { success: true, data }
  } catch (err) {
    console.error('getMyDocs error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 通过 shareCode 获取文档内容（调用云函数）
 * // codeflicker-fix: LOGIC-Issue-002/2sfzcykvrat5gct6j21b
 * // codeflicker-fix: EDGE-Issue-007/2sfzcykvrat5gct6j21b
 */
async function getDocContent(shareCode) {
  if (isMockMode()) {
    // 指南文档：永不过期，所有新用户默认可见
    if (shareCode === 'guide000') {
      return {
        success: true,
        data: {
          title: '马档使用指南',
          fileType: 'md',
          content: GUIDE_MD_CONTENT,
          viewCount: 0,
          expiresAt: null,  // null = 永不过期
        }
      }
    }
    // 用户上传的文档：查找 mock 列表中的记录
    const doc = MOCK_DOCS.find(d => d.shareCode === shareCode)
    if (!doc) {
      return { success: false, error: 'NOT_FOUND' }
    }
    return {
      success: true,
      data: {
        title: doc.title,
        fileType: doc.fileType,
        content: GUIDE_MD_CONTENT,  // mock 模式统一用指南内容
        viewCount: doc.viewCount || 0,
        expiresAt: doc.expiresAt,
      }
    }
  }
  try {
    const result = await wx.cloud.callFunction({
      name: 'getDocContent',
      data: { shareCode },
    })
    if (result.result.error) {
      return { success: false, error: result.result.error }
    }
    // codeflicker-fix: EDGE-Issue-007/2sfzcykvrat5gct6j21b
    // 检查过期
    const data = result.result
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return { success: false, error: 'EXPIRED' }
    }
    return { success: true, data }
  } catch (err) {
    console.error('getDocContent error:', err)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}

/**
 * 上传文档
 * @param {string} filePath 本地临时文件路径
 * @param {string} content 文件内容（已读取）
 * @param {string} filename 文件名
 * // codeflicker-fix: EDGE-Issue-001/2sfzcykvrat5gct6j21b
 */
async function uploadDoc(filePath, content, filename, expiryDays = 7) {
  if (isMockMode()) {
    // 碰撞检测：重试最多3次
    let shareCode = generateShareCode()
    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      const exists = MOCK_DOCS.some(doc => doc.shareCode === shareCode)
      if (!exists) break
      shareCode = generateShareCode()
      attempts++
    }
    const title = extractTitle(content, filename)
    const wordCount = countWords(content)
    let fileType = 'md'
    if (filename.endsWith('.html') || filename.endsWith('.htm')) fileType = 'html'
    else if (filename.endsWith('.txt')) fileType = 'txt'
    const doc = {
      _id: 'mock_' + Date.now(),
      shareCode,
      title,
      filename,
      fileType,
      wordCount,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryDays * 86400000).toISOString(),
      isPublic: true,
      content,
    }
    return { success: true, data: doc }
  }

  try {
    const app = getApp()
    // 碰撞检测：重试最多3次
    let shareCode = generateShareCode()
    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      const db = wx.cloud.database()
      const { data } = await db.collection('docs').where({ shareCode }).get()
      if (data.length === 0) break
      shareCode = generateShareCode()
      attempts++
    }

    const openid = app.globalData.openid || 'unknown'
    const cloudPath = `docs/${openid}/${shareCode}_${filename}`

    // 1. 上传文件到云存储（仅当 filePath 有效时）
    // codeflicker-fix: EDGE-Issue-003/chudbvwsbhsz7kn7hanw — 粘贴上传无文件路径时跳过云存储上传
    let fileID = ''
    if (filePath) {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath,
      })
      fileID = uploadRes.fileID
    }

    // 2. 写入元数据到云数据库
    const title = extractTitle(content, filename)
    const wordCount = countWords(content)
    let fileType = 'md'
    if (filename.endsWith('.html') || filename.endsWith('.htm')) fileType = 'html'
    else if (filename.endsWith('.txt')) fileType = 'txt'
    const db = wx.cloud.database()
    const docData = {
      shareCode,
      fileID,
      title,
      filename,
      fileType,
      wordCount,
      viewCount: 0,
      contentHash: computeHash(content),  // codeflicker-fix: DEDUP-Issue-1/pg216fgjaow3iox26nxk
      createdAt: db.serverDate(),
      expiresAt: db.serverDate({ offset: expiryDays * 86400000 }),
      isPublic: true,
    }
    // 粘贴上传无文件路径时，直接将内容存入数据库（避免云存储下载失败）
    // codeflicker-fix: EDGE-Issue-003/chudbvwsbhsz7kn7hanw
    if (!fileID) {
      docData.content = content.slice(0, 500000)  // 限制 500KB
    }
    const addRes = await db.collection('docs').add({ data: docData })

    return {
      success: true,
      data: { ...docData, _id: addRes._id, content }
    }
  } catch (err) {
    console.error('uploadDoc error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 删除文档
 */
async function deleteDoc(docId) {
  if (isMockMode()) {
    return { success: true }
  }
  try {
    const result = await wx.cloud.callFunction({
      name: 'deleteDoc',
      data: { docId },
    })
    if (result.result.error) {
      return { success: false, error: result.result.error }
    }
    return { success: true }
  } catch (err) {
    console.error('deleteDoc error:', err)
    return { success: false, error: err.message || 'NETWORK_ERROR' }
  }
}

module.exports = {
  getMyDocs,
  getDocContent,
  uploadDoc,
  deleteDoc,
}
