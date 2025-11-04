#!/bin/bash
set -e

echo "🚀 Setting up MCP HTTP Server..."

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 20+ first."
  exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js version 20+ is required. Current version: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
else
  echo "✅ Dependencies already installed"
fi

# Generate local TLS certificate for HTTPS dev server
CERT_DIR="cert"
CERT_PATH="$CERT_DIR/localhost.pem"
KEY_PATH="$CERT_DIR/localhost-key.pem"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  if command -v mkcert &> /dev/null; then
    echo "🔐 Generating local development TLS certificate with mkcert..."
    mkcert -install >/dev/null 2>&1 || true
    if mkcert -cert-file "$CERT_PATH" -key-file "$KEY_PATH" localhost 127.0.0.1 ::1 >/dev/null 2>&1; then
      echo "✅ mkcert certificate created at $CERT_PATH"
    else
      echo "⚠️ mkcert execution failed, falling back to OpenSSL."
      rm -f "$CERT_PATH" "$KEY_PATH"
    fi
  fi
fi

if { [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; } && command -v openssl &> /dev/null; then
  echo "🔐 Generating local development TLS certificate with OpenSSL..."
  if openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$KEY_PATH" \
    -out "$CERT_PATH" \
    -days 365 \
    -subj "/CN=localhost" \
    -addext "subjectAltName = DNS:localhost,IP:127.0.0.1" >/dev/null 2>&1; then
    echo "✅ Certificate created at $CERT_PATH"
    echo "   Remember to trust it in your OS certificate store if prompted by the browser."
  else
    echo "⚠️ OpenSSL could not generate the certificate. HTTPS fallback will be disabled."
    rm -f "$CERT_PATH" "$KEY_PATH"
  fi
fi

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
  echo "✅ Local TLS certificate ready ($CERT_PATH)"
else
  echo "⚠️ No TLS certificate found; HTTPS will be disabled unless you provide one manually."
fi

# Copy .env.example if .env doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  npm run dev"
echo ""
echo "To run smoke tests:"
echo "  npm run smoke"
echo "  curl -sk https://localhost:8443/healthz | jq"
echo "  curl -sk -X POST https://localhost:8443/tools/ping -H 'Content-Type: application/json' -d '{\"params\":{\"name\":\"Nick\"}}' | jq"
echo ""
