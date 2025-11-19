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
curl https://your-deployment.vercel.app/healthz

# MCP manifest
curl https://your-deployment.vercel.app/mcp-manifest.json

# Root endpoint
curl https://your-deployment.vercel.app/
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_STORE_URL` | Yes* | Shopify store domain |
| `SHOPIFY_ACCESS_TOKEN` | Yes* | Shopify Admin API token |
| `STRIPE_SECRET_KEY` | Yes* | Stripe secret key |
| `DEMO_MODE` | Yes | Set to `false` for production |
| `MCP_SERVER_URL` | Yes | Your Vercel deployment URL |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Frontend URL for Stripe redirects |
| `ALLOWED_ORIGINS` | Optional | Comma-separated CORS origins |

*Required unless `DEMO_MODE=true`

## Troubleshooting

- **SSE not working?** Check `vercel.json` runtime config and headers
- **CORS errors?** Add your origin to `ALLOWED_ORIGINS`
- **Env vars not working?** Ensure they're set for all environments and redeploy

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

