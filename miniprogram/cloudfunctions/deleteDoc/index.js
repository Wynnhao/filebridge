// cloudfunctions/deleteDoc/index.js
// 云函数：删除文档（云函数有管理员权限，可删除任何文档）
// 仅允许删除自己上传的文档

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { docId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!docId) {
    return { error: 'MISSING_PARAM', message: 'docId is required' }
  }

  const db = cloud.database()
  try {
    // 先查询文档，确认是本人上传的
    const { data: doc } = await db.collection('docs').doc(docId).get()

    if (!doc) {
      return { error: 'NOT_FOUND' }
    }

    // 指南文档不允许删除
    if (doc.isGuide) {
      return { error: 'FORBIDDEN', message: '使用指南不能删除' }
    }

    // 权限校验：只有文档创建者才能删除
    if (doc._openid !== openid) {
      return { error: 'FORBIDDEN', message: '只能删除自己上传的文档' }
    }

    // 删除云存储文件（如果有的话）
    if (doc.fileID) {
      try {
        await cloud.deleteFile({ fileList: [doc.fileID] })
      } catch (e) {
        console.warn('deleteFile failed:', e)
        // 文件删除失败不影响数据库记录删除
      }
    }

    // 删除数据库记录
    await db.collection('docs').doc(docId).remove()

    return { success: true }
  } catch (err) {
    console.error('deleteDoc error:', err)
    return { error: 'SERVER_ERROR', message: err.message }
  }
}