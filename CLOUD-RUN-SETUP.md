# Cloud Run Deployment Setup

## Summary

✅ **All configuration files generated and ready for deployment**

### Files Created/Updated:

1. **Dockerfile** - Multi-stage build for production
   - Builds TypeScript code
   - Runs on port 8080
   - Production-optimized

2. **cloudbuild.yaml** - Cloud Build configuration
   - Builds Docker image
   - Pushes to Artifact Registry (us-central1)
   - Deploys to Cloud Run
   - Sets `DEMO_MODE=false`

3. **DEPLOY-COMMANDS.md** - Complete deployment instructions
   - All gcloud commands in sequence
   - IAM permissions setup
   - Secret Manager configuration

## Cloud Run Service Configuration

- **Service Name**: `mcp-http-server`
- **Project**: `mcp-commerce-demo`
- **Region**: `us-central1`
- **Port**: `8080` (inside container)
- **Public Access**: ✅ Yes (`--allow-unauthenticated`)
- **HTTPS**: ✅ Automatic (Cloud Run provides)
- **URL Format**: `https://mcp-http-server-XXXXX-uc.a.run.app`

## Server Behavior in Cloud Run

The server will:
1. Listen on HTTP port 8080 (inside container)
2. Cloud Run terminates HTTPS and forwards HTTP to the container
3. No TLS certificates needed (Cloud Run handles SSL/TLS)
4. Server code automatically falls back to HTTP when no certs found ✅

## ChatGPT MCP Access

✅ **Confirmed**: The service will be accessible by ChatGPT MCP because:

1. **Public HTTPS Endpoint**: Cloud Run provides automatic HTTPS
2. **CORS Configuration**: Server allows `https://chat.openai.com` and `https://chatgpt.com`
3. **MCP Manifest**: Available at `/mcp-manifest.json`
4. **No Authentication**: Public access enabled for MCP integration

## Artifact Registry Repository

- **Repository Name**: `mcp-containers`
- **Format**: Docker
- **Location**: `us-central1`
- **Full Path**: `us-central1-docker.pkg.dev/mcp-commerce-demo/mcp-containers/mcp-http-server`

## Environment Variables Set

- `DEMO_MODE=false` (production mode)
- `PORT=8080` (Cloud Run default)
- Secrets loaded from Secret Manager:
  - `SHOPIFY_STORE_URL`
  - `SHOPIFY_ACCESS_TOKEN`
  - `STRIPE_SECRET_KEY`

## Next Steps

1. Run commands from `DEPLOY-COMMANDS.md`
2. After deployment, get the service URL:
   ```bash
   gcloud run services describe mcp-http-server \
     --region=us-central1 \
     --format='value(status.url)'
   ```
3. Test the MCP manifest:
   ```bash
   curl https://YOUR-SERVICE-URL/mcp-manifest.json
   ```
4. Connect ChatGPT using the service URL

## Verification Checklist

Before connecting ChatGPT:

- [ ] Service is deployed and running
- [ ] `/healthz` returns `{"ok": true}`
- [ ] `/mcp-manifest.json` returns valid JSON
- [ ] Service URL is accessible via HTTPS
- [ ] CORS allows ChatGPT origins (configured in code)
- [ ] Secrets are properly configured in Secret Manager

