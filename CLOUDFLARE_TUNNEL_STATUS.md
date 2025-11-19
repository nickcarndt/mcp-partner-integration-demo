# Cloudflare Tunnel Status

## Current Setup

**Cloudflare Tunnel URL (Quick Tunnel - Temporary):**
```
https://privacy-anna-hosted-vision.trycloudflare.com
```

**Cloud Run Backend:**
```
https://mcp-server-839650329042.us-central1.run.app
```

## Tunnel Process

The tunnel is running in the background. To check status:

```bash
ps aux | grep cloudflared
```

To view logs:
```bash
tail -f /tmp/cloudflared-new.log
```

## Important Notes

⚠️ **Quick tunnels are temporary** and will expire when:
- The cloudflared process stops
- The tunnel connection is lost
- Cloudflare terminates the tunnel (no uptime guarantee)

## For Production Use

You need to set up a **named tunnel** with your own domain:

1. **Authenticate with Cloudflare:**
   ```bash
   cloudflared tunnel login
   ```

2. **Create a named tunnel:**
   ```bash
   cloudflared tunnel create mcp-server-tunnel
   ```

3. **Configure DNS:**
   ```bash
   cloudflared tunnel route dns mcp-server-tunnel mcp.yourdomain.com
   ```

4. **Create config file** (`.cloudflared/config.yaml`):
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

5. **Run the tunnel:**
   ```bash
   cloudflared tunnel run mcp-server-tunnel
   ```

6. **Update MCP_SERVER_URL:**
   ```bash
   gcloud run services update mcp-server \
     --region us-central1 \
     --set-env-vars MCP_SERVER_URL=https://mcp.yourdomain.com \
     --project mcp-commerce-demo
   ```

## Testing the Tunnel

```bash
# Test root endpoint
curl https://privacy-anna-hosted-vision.trycloudflare.com/

# Test manifest
curl https://privacy-anna-hosted-vision.trycloudflare.com/mcp-manifest.json

# Test SSE
curl -N https://privacy-anna-hosted-vision.trycloudflare.com/sse
```

## Deployment Status

✅ **Deployment completed** with `MCP_SERVER_URL` support in:
- `cloudbuild.yaml` - Added `_MCP_SERVER_URL` substitution
- Deployment scripts - Ready to accept `MCP_SERVER_URL` environment variable

The manifest will now use `MCP_SERVER_URL` if set, otherwise fall back to the request host.

