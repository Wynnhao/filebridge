// cloudfunctions/getDocContent/index.js
// 云函数：通过 shareCode 获取文档内容
// 已启用正式云开发逻辑

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { shareCode } = event

  // 参数校验：shareCode 必须为 8-12 位字母数字组合
  // codeflicker-fix: SEC-Issue-001/7k3sz5llqevbucvw3joj
  if (!shareCode || !/^[a-zA-Z0-9]{8,12}$/.test(shareCode)) {
    return { error: 'INVALID_PARAM', message: 'shareCode format invalid' }
  }

  const db = cloud.database()
  try {
    const { data } = await db.collection('docs')
      .where({ shareCode, isPublic: true })
      .get()

    if (!data || data.length === 0) {
      return { error: 'NOT_FOUND' }
    }

    const doc = data[0]

    // 检查过期（expiresAt 为 null 或不存在时永不过期）
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
      return { error: 'EXPIRED' }
    }

    // 指南文档（isGuide=true）或有直接存储 content 的文档（粘贴上传无文件路径时）
    // codeflicker-fix: EDGE-Issue-003/chudbvwsbhsz7kn7hanw — 支持 content 字段直接读取
    if (doc.content) {
      // 增加访问计数
      await db.collection('docs').doc(doc._id).update({
        data: { viewCount: db.command.inc(1) }
      })
      return {
        title: doc.title,
        fileType: doc.fileType || 'md',
        content: doc.content,
        viewCount: (doc.viewCount || 0) + 1,
        expiresAt: doc.expiresAt,  // null = 永不过期
      }
    }

    // 用户上传的文档：从云存储下载文件内容
    const downloadRes = await cloud.downloadFile({ fileID: doc.fileID })
    const content = downloadRes.fileContent.toString('utf-8')

    // 增加访问计数
    await db.collection('docs').doc(doc._id).update({
      data: { viewCount: db.command.inc(1) }
    })

    return {
      title: doc.title,
      fileType: doc.fileType,
      content,
      viewCount: (doc.viewCount || 0) + 1,
      expiresAt: doc.expiresAt,
    }
  } catch (err) {
    console.error('getDocContent error:', err)
    return { error: 'SERVER_ERROR', message: err.message }
  }
}