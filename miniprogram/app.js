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

  // codeflicker-fix: THEME-Issue-001/chudbvwsbhsz7kn7hanw — 全局主题持久化
  globalData: {
    cloudEnvId: CLOUD_ENV_ID,
    openid: '',
    cloudInited: false,
    theme: 'light',
  },

  // 读取并应用持久化的主题
  loadTheme() {
    try {
      const stored = wx.getStorageSync('app_theme')
      if (stored === 'light' || stored === 'dark') {
        this.globalData.theme = stored
      }
    } catch (e) {
      // 静默忽略
    }
    return this.globalData.theme
  },

  // 切换主题并持久化
  toggleTheme() {
    const next = this.globalData.theme === 'light' ? 'dark' : 'light'
    this.globalData.theme = next
    wx.setStorageSync('app_theme', next)
    return next
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