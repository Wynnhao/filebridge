/**
 * packages-doc-bridge/index.js
 * doc-bridge SKILL 注册入口
 * 
 * 注册当前 SKILL 所涉及的所有原子接口。
 * 当小程序 AI 发起原子接口调用时，从此注册列表中找到函数入口并执行。
 * 
 * // codeflicker-fix: AI-SKILL-001/daeuzbg9iihmcas3kg2v
 * // codeflicker-fix: COMPAT-Issue-1/gimlwacm7df67zl0zjur — 所有原子接口已改为使用分包内 local utils 和直接 wx.cloud API
 */

const { uploadDocument } = require('./apis/uploadDocument')
const { searchMyDocs } = require('./apis/searchMyDocs')
const { getDocumentInfo } = require('./apis/getDocumentInfo')
const { deleteDocument } = require('./apis/deleteDocument')

/**
 * SKILL 入口函数
 * 使用 wx.modelContext.createSkill + registerAPI 模式注册原子接口
 */
function registerSkill() {
  try {
    // 创建 SKILL 实例（path 与 app.json 中 agent.skills[].path 一致）
    const skill = wx.modelContext.createSkill('/packages-doc-bridge')

    // 注册中间件（统一错误处理和日志）
    skill.use(async (ctx, next) => {
      const startTime = Date.now()
      console.log(`[doc-bridge] 原子接口调用开始: ${ctx.apiName}`)

      try {
        await next()
        console.log(`[doc-bridge] 原子接口调用成功: ${ctx.apiName}, 耗时: ${Date.now() - startTime}ms`)
      } catch (err) {
        console.error(`[doc-bridge] 原子接口调用失败: ${ctx.apiName}`, err)
        throw err
      }
    })

    // 注册所有原子接口
    skill.registerAPI('uploadDocument', uploadDocument)
    skill.registerAPI('searchMyDocs', searchMyDocs)
    skill.registerAPI('getDocumentInfo', getDocumentInfo)
    skill.registerAPI('deleteDocument', deleteDocument)

    console.log('[doc-bridge] SKILL 注册完成，已注册 4 个原子接口')
    return skill
  } catch (err) {
    console.error('[doc-bridge] SKILL 注册失败:', err)
    // 降级方案：兼容不支持 AI 模式的旧版基础库
    // 直接使用 wx.modelContext.registerAPI 逐条注册
    try {
      wx.modelContext.registerAPI('uploadDocument', uploadDocument)
      wx.modelContext.registerAPI('searchMyDocs', searchMyDocs)
      wx.modelContext.registerAPI('getDocumentInfo', getDocumentInfo)
      wx.modelContext.registerAPI('deleteDocument', deleteDocument)
      console.log('[doc-bridge] SKILL 注册完成（降级模式）')
    } catch (e) {
      console.warn('[doc-bridge] AI 模式 API 注册失败，当前基础库可能不支持:', e)
    }
  }
}

// 自动注册
registerSkill()

module.exports = {
  uploadDocument,
  searchMyDocs,
  getDocumentInfo,
  deleteDocument
}