#!/bin/bash
# Warm up MCP server before connecting in ChatGPT
# Run this script, then IMMEDIATELY (within 5 seconds) connect in ChatGPT

SERVICE_URL="https://mcp-server-839650329042.us-central1.run.app"

echo "🔥 Warming up MCP server..."
echo ""

# Warm up all critical endpoints
echo "1. Warming /healthz..."
curl -s ${SERVICE_URL}/healthz > /dev/null

echo "2. Warming /mcp-manifest.json..."
curl -s ${SERVICE_URL}/mcp-manifest.json > /dev/null

echo "3. Warming /sse (establishing connection)..."
curl -N -s --max-time 2 ${SERVICE_URL}/sse > /dev/null 2>&1

echo ""
echo "✅ Service warmed up!"
echo ""
echo "⚠️  IMPORTANT: Connect in ChatGPT NOW (within 5 seconds)"
echo "   The service will stay warm for a few seconds"
echo ""

