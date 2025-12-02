#!/bin/bash
# Verification script for MCP server endpoints
# Usage: ./verify-deployment.sh <your-domain>

if [ -z "$1" ]; then
  echo "Usage: $0 <your-domain>"
  echo "Example: $0 mcp-partner-integration-demo.vercel.app"
  exit 1
fi

DOMAIN="$1"
BASE_URL="https://${DOMAIN}"

echo "Verifying MCP server endpoints on ${BASE_URL}"
echo "=========================================="
echo ""

# Test /api/index
echo "1. Testing /api/index..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/index")
if [ "$STATUS" = "200" ]; then
  echo "   ✅ /api/index returned 200"
else
  echo "   ❌ /api/index returned ${STATUS}"
fi

# Test /api/mcp-manifest.json
echo "2. Testing /api/mcp-manifest.json..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/mcp-manifest.json")
if [ "$STATUS" = "200" ]; then
  echo "   ✅ /api/mcp-manifest.json returned 200"
else
  echo "   ❌ /api/mcp-manifest.json returned ${STATUS}"
fi

# Test /api/sse (HEAD request to check if endpoint exists)
echo "3. Testing /api/sse..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -I "${BASE_URL}/api/sse")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "405" ]; then
  echo "   ✅ /api/sse endpoint exists (returned ${STATUS})"
else
  echo "   ❌ /api/sse returned ${STATUS}"
fi

# Test root /
echo "4. Testing / (root)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/")
if [ "$STATUS" = "200" ]; then
  echo "   ✅ / returned 200"
else
  echo "   ❌ / returned ${STATUS}"
fi

echo ""
echo "=========================================="
echo "Verification complete!"

