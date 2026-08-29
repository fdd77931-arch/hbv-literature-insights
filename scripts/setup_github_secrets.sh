#!/bin/bash
# ============================================================
# GitHub Secrets 一键配置脚本
# 使用方法：在终端运行 bash scripts/setup_github_secrets.sh
# ============================================================

set -e

REPO="fdd77931-arch/hbv-literature-insights"

echo "=========================================="
echo "  GitHub Secrets 配置脚本"
echo "  Repository: $REPO"
echo "=========================================="
echo ""

# 检查 gh CLI 认证状态
if ! gh auth status &>/dev/null; then
    echo ">>> 需要先认证 GitHub CLI"
    echo "    运行: gh auth login"
    echo "    选择: GitHub.com -> HTTPS -> Login with a web browser"
    echo "    完成后重新运行此脚本"
    gh auth login
fi

echo ">>> GitHub 认证成功"
echo ""

# 已知值（从飞书连通性验证中获得）
FEISHU_APP_TOKEN="PWl8b1XQ1atm6ts2WdkcBIOpnfc"
FEISHU_TABLE_ID="tblpOZ48vS3LToFo"

echo ">>> 设置已知 Secrets..."
echo "    FEISHU_APP_TOKEN = $FEISHU_APP_TOKEN"
echo "    FEISHU_TABLE_ID = $FEISHU_TABLE_ID"
echo "$FEISHU_APP_TOKEN" | gh secret set FEISHU_APP_TOKEN --repo "$REPO"
echo "$FEISHU_TABLE_ID" | gh secret set FEISHU_TABLE_ID --repo "$REPO"
echo ""

echo ">>> 请提供以下凭证（输入时不会显示在屏幕上）："
echo ""

read -s -p "FEISHU_APP_ID: " FEISHU_APP_ID
echo ""
read -s -p "FEISHU_APP_SECRET: " FEISHU_APP_SECRET
echo ""
read -s -p "DEEPSEEK_API_KEY: " DEEPSEEK_API_KEY
echo ""
read -p  "DEEPSEEK_MODEL (默认 deepseek-chat): " DEEPSEEK_MODEL
DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-chat}"
echo ""

echo ">>> 正在设置 Secrets..."

echo "$FEISHU_APP_ID" | gh secret set FEISHU_APP_ID --repo "$REPO"
echo "  ✅ FEISHU_APP_ID"

echo "$FEISHU_APP_SECRET" | gh secret set FEISHU_APP_SECRET --repo "$REPO"
echo "  ✅ FEISHU_APP_SECRET"

echo "$DEEPSEEK_API_KEY" | gh secret set DEEPSEEK_API_KEY --repo "$REPO"
echo "  ✅ DEEPSEEK_API_KEY"

echo "$DEEPSEEK_MODEL" | gh secret set DEEPSEEK_MODEL --repo "$REPO"
echo "  ✅ DEEPSEEK_MODEL"

echo ""
echo ">>> 验证已配置的 Secrets..."
gh secret list --repo "$REPO"

echo ""
echo "=========================================="
echo "  全部 6 个 Secrets 配置完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 去 GitHub Actions 页面手动触发 sync-only 模式"
echo "     https://github.com/$REPO/actions/workflows/sync-and-deploy.yml"
echo "  2. 或运行: gh workflow run sync-and-deploy.yml --repo $REPO -f mode=sync-only"
echo ""
