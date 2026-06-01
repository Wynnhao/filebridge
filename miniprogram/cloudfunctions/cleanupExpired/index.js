// cloudfunctions/cleanupExpired/index.js
// 云函数：定时清理过期文档（可设置为每天触发一次）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const now = new Date().toISOString()

  try {
    // 查询所有已过期的文档
    const { data: expiredDocs } = await db.collection('docs')
      .where({
        expiresAt: db.command.lt(now),
      })
      .get()

    if (!expiredDocs || expiredDocs.length === 0) {
      return { cleaned: 0, message: 'No expired docs' }
    }

    // 删除云存储中的文件
    const fileIDs = expiredDocs.map(d => d.fileID).filter(Boolean)
    if (fileIDs.length > 0) {
      await cloud.deleteFile({ fileList: fileIDs })
    }

    // 删除数据库记录
    const docIds = expiredDocs.map(d => d._id)
    for (const id of docIds) {
      await db.collection('docs').doc(id).remove()
    }

    console.log(`Cleaned ${expiredDocs.length} expired docs`)
    return { cleaned: expiredDocs.length }
  } catch (err) {
    console.error('cleanupExpired error:', err)
    return { error: err.message }
  }
}
