// cloudfunctions/incrementShare/index.js
// 云函数：递增文档分享次数（静默调用，不影响分享流程）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { shareCode } = event

  if (!shareCode) {
    return { error: 'INVALID_PARAM' }
  }

  try {
    await db.collection('docs').where({ shareCode }).update({
      data: {
        shareCount: db.command.inc(1)
      }
    })
    return { success: true }
  } catch (err) {
    console.error('incrementShare error:', err)
    return { error: 'SERVER_ERROR' }
  }
}