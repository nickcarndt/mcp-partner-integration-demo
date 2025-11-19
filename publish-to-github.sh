#!/bin/bash
# Script to publish mcp-partner-integration-demo to GitHub
# Run this after creating the GitHub repository manually

set -e

echo "🚀 Publishing MCP Partner Integration Demo to GitHub"
echo ""

# Check if remote is already set
if git remote get-url origin >/dev/null 2>&1; then
  echo "✅ Remote origin already configured"
  REMOTE_URL=$(git remote get-url origin)
  echo "   Current: $REMOTE_URL"
  echo ""
  read -p "Use existing remote? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the remote manually:"
    echo "  git remote set-url origin https://github.com/YOUR_USERNAME/mcp-partner-integration-demo.git"
    exit 1
  fi
else
  echo "⚠️  No remote origin configured"
  echo ""
  echo "Please create the GitHub repository first:"
  echo "  1. Go to: https://github.com/new"
  echo "  2. Repository name: mcp-partner-integration-demo"
  echo "  3. Description: Secure MCP HTTP Server demo for ChatGPT partner integrations (Shopify + Stripe)"
  echo "  4. Visibility: Public"
  echo "  5. Topics: mcp, chatgpt-ecosystem, shopify, stripe, express, typescript, solutions-architect, openai"
  echo "  6. DO NOT initialize with README, .gitignore, or license"
  echo ""
  read -p "Enter your GitHub username: " GITHUB_USER
  if [ -z "$GITHUB_USER" ]; then
    echo "❌ GitHub username required"
    exit 1
  fi
  
  git remote add origin "https://github.com/$GITHUB_USER/mcp-partner-integration-demo.git"
  echo "✅ Remote origin configured"
fi

# Ensure we're on main branch
git branch -M main

# Push main branch
echo ""
echo "📤 Pushing main branch..."
git push -u origin main

# Push tag
echo ""
echo "📤 Pushing tag v0.1.1..."
git push origin v0.1.1

echo ""
echo "✅ Repository published successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Create a GitHub Release:"
echo "     https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/new"
echo ""
echo "  2. Release details:"
echo "     - Tag: v0.1.1"
echo "     - Title: v0.1.1 - Secure MCP Demo"
echo "     - Description:"
echo "       Secure MCP HTTP server demo showing partner integration patterns for ChatGPT."
echo ""
echo "       - HTTPS + strict CORS"
echo "       - Structured error envelopes (BAD_PARAMS, BAD_JSON, CORS_BLOCKED, INTERNAL_ERROR)"
echo "       - DEMO_MODE mocks for Shopify & Stripe"
echo "       - Full documentation and tests"
echo ""
echo "🌐 Your repository URL:"
echo "   $(git remote get-url origin | sed 's/\.git$//')"

