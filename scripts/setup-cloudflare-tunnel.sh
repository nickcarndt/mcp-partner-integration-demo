#!/bin/bash
# Setup Cloudflare Tunnel for MCP Server
# This provides true HTTP/2 end-to-end and fixes ChatGPT connection issues

set -e

CLOUDRUN_URL="https://mcp-server-839650329042.us-central1.run.app"
TUNNEL_NAME="mcp-server-tunnel"
CONFIG_DIR=".cloudflared"
CREDENTIALS_FILE="${CONFIG_DIR}/credentials.json"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Cloudflare Tunnel Setup for MCP Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed"
    echo "Install it with: brew install cloudflare/cloudflare/cloudflared"
    exit 1
fi

echo "✅ cloudflared is installed"
echo ""

# Create config directory
mkdir -p "${CONFIG_DIR}"

# Check if tunnel already exists
if [ -f "${CREDENTIALS_FILE}" ]; then
    echo "⚠️  Tunnel credentials already exist at ${CREDENTIALS_FILE}"
    read -p "Do you want to create a new tunnel? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing tunnel..."
        TUNNEL_ID=$(cat "${CREDENTIALS_FILE}" | grep -o '"TunnelID":"[^"]*' | cut -d'"' -f4)
        echo "Tunnel ID: ${TUNNEL_ID}"
    else
        echo "Creating new tunnel..."
        cloudflared tunnel create "${TUNNEL_NAME}" || {
            echo "⚠️  Tunnel may already exist. Listing tunnels..."
            cloudflared tunnel list
            exit 1
        }
        cloudflared tunnel route dns "${TUNNEL_NAME}" mcp-server || {
            echo "⚠️  DNS route may already exist or you need to configure DNS manually"
        }
    fi
else
    echo "Creating new Cloudflare Tunnel..."
    echo ""
    echo "You'll need to:"
    echo "1. Log in to Cloudflare (will open browser)"
    echo "2. Select your account"
    echo "3. The tunnel will be created automatically"
    echo ""
    read -p "Press Enter to continue..."
    
    # Create tunnel
    cloudflared tunnel create "${TUNNEL_NAME}" || {
        echo "❌ Failed to create tunnel. Make sure you're logged in to Cloudflare."
        exit 1
    }
    
    # Get tunnel ID
    TUNNEL_ID=$(cloudflared tunnel info "${TUNNEL_NAME}" | grep -o 'id: [a-f0-9-]*' | cut -d' ' -f2)
    echo "✅ Tunnel created: ${TUNNEL_ID}"
fi

# Create config file
cat > "${CONFIG_DIR}/config.yaml" << EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${PWD}/${CREDENTIALS_FILE}

ingress:
  - hostname: mcp-server.yourdomain.com
    service: ${CLOUDRUN_URL}
    originRequest:
      http2Origin: true
      noHappyEyeballs: true
      keepAliveConnections: 10
      keepAliveTimeout: 90s
      connectTimeout: 30s
      tcpKeepAlive: 30s
      disableChunkedEncoding: false
  - service: http_status:404
EOF

echo ""
echo "✅ Configuration file created: ${CONFIG_DIR}/config.yaml"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Update DNS in Cloudflare Dashboard:"
echo "   - Add CNAME record: mcp-server.yourdomain.com -> ${TUNNEL_ID}.cfargotunnel.com"
echo ""
echo "2. Or use quick tunnel for testing (temporary domain):"
echo "   cloudflared tunnel --url ${CLOUDRUN_URL}"
echo ""
echo "3. Start the tunnel:"
echo "   cloudflared tunnel run ${TUNNEL_NAME}"
echo ""
echo "4. Update MCP_SERVER_URL environment variable with the new domain"
echo ""

