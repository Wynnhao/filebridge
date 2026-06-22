// cloudfunctions/pinDoc/index.js
// 云函数：切换文档置顶状态（需验证文档所有者身份）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { docId, pinned } = event

  if (!docId || pinned === undefined) {
    return { error: 'INVALID_PARAM', message: '缺少参数' }
  }

  try {
    const { data } = await db.collection('docs').doc(docId).get()
    if (!data || data.length === 0) {
      // doc() 直接返回单条，不存在时 data 为 null
      if (!data) {
        return { error: 'NOT_FOUND', message: '文档不存在' }
      }
    }
    const doc = data

    // 验证权限：仅文档所有者可以置顶
    if (doc._openid !== openid) {
      return { error: 'FORBIDDEN', message: '无权操作此文档' }
    }

    await db.collection('docs').doc(docId).update({
      data: { pinned }
    })

    return { success: true, pinned }
  } catch (err) {
    console.error('pinDoc error:', err)
    return { error: 'SERVER_ERROR', message: '操作失败' }
  }
}