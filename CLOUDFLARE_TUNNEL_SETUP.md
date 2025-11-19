# Cloudflare Tunnel Setup for MCP Server

This guide sets up a Cloudflare Tunnel to provide true HTTP/2 end-to-end connectivity for the ChatGPT MCP connector.

## Why Cloudflare Tunnel?

- **True HTTP/2 end-to-end**: Cloud Run's HTTP/2 support requires backend HTTP/2, but Express uses HTTP/1.1
- **No buffering**: Cloudflare Tunnel passes SSE responses immediately
- **ChatGPT compatibility**: Meets ChatGPT's strict transport requirements

## Quick Setup (Temporary Domain)

For immediate testing, use a quick tunnel:

```bash
# Start quick tunnel (temporary domain)
cloudflared tunnel --url https://mcp-server-839650329042.us-central1.run.app
```

This will output a URL like: `https://xxxxx.trycloudflare.com`

**Note**: Quick tunnels are temporary and not suitable for production.

## Production Setup (Named Tunnel)

### 1. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will open your browser to authorize the tunnel.

### 2. Create a Named Tunnel

```bash
cloudflared tunnel create mcp-server-tunnel
```

### 3. Configure DNS (if you have a domain)

```bash
# Option A: Automatic DNS (requires domain in Cloudflare)
cloudflared tunnel route dns mcp-server-tunnel mcp.yourdomain.com

# Option B: Manual DNS
# Add CNAME in Cloudflare Dashboard:
# mcp.yourdomain.com -> <tunnel-id>.cfargotunnel.com
```

### 4. Create Configuration File

Create `.cloudflared/config.yaml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  - hostname: mcp.yourdomain.com
    service: https://mcp-server-839650329042.us-central1.run.app
    originRequest:
      http2Origin: true
      noHappyEyeballs: true
      keepAliveConnections: 10
      keepAliveTimeout: 90s
      connectTimeout: 30s
      tcpKeepAlive: 30s
      disableChunkedEncoding: false
  - service: http_status:404
```

### 5. Run the Tunnel

```bash
# Run in foreground
cloudflared tunnel run mcp-server-tunnel

# Or run as a service (recommended for production)
cloudflared service install
cloudflared tunnel run mcp-server-tunnel
```

### 6. Update Environment Variable

Set `MCP_SERVER_URL` to your Cloudflare domain:

```bash
export MCP_SERVER_URL=https://mcp.yourdomain.com
```

Or update in Cloud Run deployment:

```bash
gcloud run services update mcp-server \
  --region us-central1 \
  --set-env-vars MCP_SERVER_URL=https://mcp.yourdomain.com \
  --project mcp-commerce-demo
```

## Verification

Test the Cloudflare URL:

```bash
# Test root endpoint
curl https://mcp.yourdomain.com/

# Test manifest
curl https://mcp.yourdomain.com/mcp-manifest.json

# Test SSE
curl -N https://mcp.yourdomain.com/sse
```

## Troubleshooting

### Tunnel Not Starting

```bash
# Check tunnel status
cloudflared tunnel list

# Check logs
cloudflared tunnel info mcp-server-tunnel
```

### DNS Not Resolving

- Verify CNAME record in Cloudflare Dashboard
- Wait for DNS propagation (can take a few minutes)
- Check: `dig mcp.yourdomain.com`

### Connection Issues

- Verify Cloud Run service is accessible: `curl https://mcp-server-839650329042.us-central1.run.app/healthz`
- Check tunnel logs: `cloudflared tunnel run mcp-server-tunnel --loglevel debug`

## Running as a Service

For production, run the tunnel as a system service:

```bash
# Install service
cloudflared service install

# Start service
cloudflared tunnel run mcp-server-tunnel
```

The tunnel will automatically restart on system reboot.

