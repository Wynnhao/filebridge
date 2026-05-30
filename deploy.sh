#!/usr/bin/env bash
# ============================================================
# FileBridge 部署向导
# ============================================================
# 使用前确保：
#   1. 已安装 Node.js 18+ 或 Bun 1.0+
#   2. 已有 Cloudflare 账号（免费即可）
#      https://cloudflare.com
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$SCRIPT_DIR/worker"

echo ""
echo "🌉 FileBridge 部署向导"
echo "════════════════════════════════════════"
echo ""

# ── 检查运行时 ──────────────────────────────────────────────
NODE_BIN=""
BUN_BIN=""

if command -v node &>/dev/null; then
  NODE_BIN="node"
  echo "✅ Node.js $(node --version)"
fi

if command -v bun &>/dev/null; then
  BUN_BIN="bun"
  echo "✅ Bun $(bun --version)"
elif [ -f "$HOME/.bun/bin/bun" ]; then
  BUN_BIN="$HOME/.bun/bin/bun"
  echo "✅ Bun $($BUN_BIN --version) [~/.bun/bin/bun]"
fi

if [ -z "$NODE_BIN" ] && [ -z "$BUN_BIN" ]; then
  echo "❌ 未检测到 Node.js 或 Bun"
  echo "   请安装 Node.js 18+：https://nodejs.org"
  echo "   或安装 Bun：https://bun.sh"
  exit 1
fi

# 优先使用 bun
if [ -n "$BUN_BIN" ]; then
  RUNTIME="$BUN_BIN"
  PACKAGE_MANAGER="$BUN_BIN"
  WRANGLER_BIN="$BUN_BIN x wrangler"
else
  RUNTIME="$NODE_BIN"
  PACKAGE_MANAGER="npm"
  WRANGLER_BIN="npx wrangler"
fi

echo ""
echo "📦 安装依赖..."
cd "$WORKER_DIR"
$PACKAGE_MANAGER install

echo ""
echo "════════════════════════════════════════"
echo "📋 接下来需要手动执行以下步骤："
echo ""
echo "【Step 1】登录 Cloudflare"
echo "   $WRANGLER_BIN auth login"
echo ""
echo "【Step 2】创建 R2 Bucket（存储 HTML 文件）"
echo "   $WRANGLER_BIN r2 bucket create filebridge-docs"
echo ""
echo "【Step 3】创建 KV 命名空间（存储元数据）"
echo "   $WRANGLER_BIN kv namespace create DOC_META"
echo "   ⚠️  记下输出的 id 和 preview_id"
echo ""
echo "【Step 4】填入 KV ID"
echo "   编辑 worker/wrangler.toml，将 PLACEHOLDER_KV_ID"
echo "   替换为上一步的真实 ID"
echo ""
echo "【Step 5】本地测试"
echo "   cd worker && $WRANGLER_BIN dev"
echo "   # 另开终端："
echo "   curl -F 'file=@../README.md' http://localhost:8787/upload"
echo ""
echo "【Step 6】部署到 Cloudflare"
echo "   cd worker && $WRANGLER_BIN deploy"
echo "   # 部署成功后更新 wrangler.toml 中的 BASE_URL"
echo "   # 再次 deploy 使链接正确"
echo ""
echo "════════════════════════════════════════"
echo "📖 完整文档：README.md"
echo ""
