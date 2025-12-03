# Quick Start - Vercel Deployment

## Step-by-Step Deployment

### 1. Install Dependencies

```bash
cd vercel-server
npm install
```

### 2. Deploy to Vercel (Preview)

```bash
vercel
```

Follow the prompts. This creates a preview deployment.

### 3. Set Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables (select **Production**, **Preview**, and **Development**):

```
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
STRIPE_SECRET_KEY=sk_test_...
DEMO_MODE=false
MCP_SERVER_URL=https://your-preview-url.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://chat.openai.com,https://chatgpt.com
```

### 4. Deploy to Production

```bash
vercel --prod
```

### 5. Update MCP_SERVER_URL

After production deployment:

1. Note your production URL (e.g., `https://mcp-http-server.vercel.app`)
2. Update `MCP_SERVER_URL` in Vercel dashboard with the production URL
3. Redeploy: `vercel --prod`

### 6. Verify

```bash
# Health check
curl https://your-deployment.vercel.app/api/healthz

# MCP Streamable HTTP
curl -X POST https://your-deployment.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` | Yes* | Shopify store domain/subdomain |
| `SHOPIFY_ACCESS_TOKEN` | Yes* | Shopify Admin API token |
| `SHOPIFY_API_VERSION` | Optional | Shopify API version (default `2024-10`) |
| `STRIPE_SECRET_KEY` | Yes* | Stripe secret key |
| `DEMO_MODE` | Yes | Set to `false` for production (or `true` for mock mode) |
| `MCP_SERVER_URL` | Optional | Override public MCP URL |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Frontend URL for Stripe redirects |
| `ALLOWED_ORIGINS` | Optional | Comma-separated CORS origins |

*Required unless `DEMO_MODE=true`

## Troubleshooting

- **CORS errors?** Add your origin to `ALLOWED_ORIGINS`
- **Env vars not working?** Ensure they're set for all environments and redeploy
- **Cannot call tools?** POST MCP JSON-RPC requests to `/mcp` (rewritten to `/api/server`)

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
