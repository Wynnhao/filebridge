// app.js
// codeflicker-fix: MAINT-Issue-004/etylurrwshqhapr9hqyi — envId 提取为常量，消除重复定义

const CLOUD_ENV_ID = 'cloud1-d9g5twb0u156be074'

App({
  onLaunch() {
    // 云开发初始化（同步初始化不阻塞）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true,
      })
    }
  },

  globalData: {
    cloudEnvId: CLOUD_ENV_ID,
    openid: '',
    cloudInited: false,
  },

  // 获取 openid（异步，不阻塞页面加载）
  getOpenid() {
    if (this.globalData.openid) {
      return Promise.resolve(this.globalData.openid)
    }
    return wx.cloud.callFunction({
      name: 'login',
    }).then(res => {
      const openid = res.result.openid
      this.globalData.openid = openid
      this.globalData.cloudInited = true
      return openid
    }).catch(err => {
      console.warn('获取 openid 失败:', err)
      return ''
    })
  },
})