// cloudfunctions/login/index.js
// 云函数：获取用户 openid
// 微信小程序云开发自动提供 openid，无需额外鉴权

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || '',
  }
}