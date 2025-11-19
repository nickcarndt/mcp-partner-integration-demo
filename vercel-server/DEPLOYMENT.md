# Vercel Deployment Guide

This guide walks you through deploying the MCP HTTP Server to Vercel.

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. Environment variables ready (see below)

## Step 1: Install Dependencies

```bash
cd vercel-server
npm install
```

## Step 2: Set Up Environment Variables

Before deploying, prepare your environment variables. You'll set these in the Vercel dashboard after the first deployment.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_STORE_URL` | Shopify store domain | `your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token | `shpat_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` or `sk_live_...` |
| `DEMO_MODE` | Enable demo mode | `false` (for production) |
| `MCP_SERVER_URL` | MCP server URL | Set after deployment |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL | `https://your-frontend.vercel.app` |
| `ALLOWED_ORIGINS` | CORS origins (optional) | `https://chat.openai.com,https://chatgpt.com` |

## Step 3: Initial Deployment

Deploy to Vercel (preview deployment):

```bash
cd vercel-server
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account/team
- Link to existing project? **No** (first time) or **Yes** (if updating)
- Project name? Enter a name (e.g., `mcp-http-server`)
- Directory? **./** (current directory)
- Override settings? **No**

This will create a preview deployment and give you a URL like:
`https://mcp-http-server-abc123.vercel.app`

## Step 4: Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each environment variable:

   ```
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_...
   STRIPE_SECRET_KEY=sk_test_...
   DEMO_MODE=false
   MCP_SERVER_URL=https://mcp-http-server-abc123.vercel.app
   NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
   ```

   **Important:** Select **Production**, **Preview**, and **Development** for each variable.

5. Click **Save**

## Step 5: Update MCP_SERVER_URL

After setting the environment variables, you need to update `MCP_SERVER_URL` with your production URL:

1. Deploy to production to get the final URL:
   ```bash
   vercel --prod
   ```

2. Note the production URL (e.g., `https://mcp-http-server.vercel.app`)

3. Update `MCP_SERVER_URL` in Vercel dashboard:
   - Go to **Settings** → **Environment Variables**
   - Edit `MCP_SERVER_URL`
   - Set to your production URL: `https://mcp-http-server.vercel.app`
   - Save

4. Redeploy to apply the change:
   ```bash
   vercel --prod
   ```

## Step 6: Production Deployment

Deploy to production:

```bash
vercel --prod
```

This will deploy to your production domain (e.g., `https://mcp-http-server.vercel.app`).

## Step 7: Verify Deployment

Test the endpoints:

```bash
# Health check
curl https://your-deployment.vercel.app/healthz

# MCP manifest
curl https://your-deployment.vercel.app/mcp-manifest.json

# Root endpoint (MCP discovery)
curl https://your-deployment.vercel.app/
```

Expected responses:
- `/healthz` should return `{"ok":true,"status":"ok",...}`
- `/mcp-manifest.json` should return the MCP manifest
- `/` should return MCP discovery metadata

## Step 8: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains** in Vercel dashboard
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `MCP_SERVER_URL` environment variable with your custom domain

## Troubleshooting

### SSE Endpoint Not Working

- Ensure `vercel.json` has the correct runtime configuration
- Check that headers are set correctly (no buffering)
- Verify the function timeout is set to 60s for SSE

### CORS Errors

- Add your frontend URL to `ALLOWED_ORIGINS`
- Ensure `NEXT_PUBLIC_SITE_URL` is set correctly
- Check that CORS headers are being set in responses

### Environment Variables Not Working

- Ensure variables are set for **Production**, **Preview**, and **Development**
- Redeploy after adding/updating variables
- Check variable names match exactly (case-sensitive)

### Function Timeout

- SSE endpoint has a 60s timeout (configured in `vercel.json`)
- Other endpoints use default timeout (10s)
- For longer operations, consider increasing timeout in `vercel.json`

## Continuous Deployment

Vercel automatically deploys on:
- Push to main branch (production)
- Pull requests (preview deployments)

To disable auto-deployment, go to **Settings** → **Git** in Vercel dashboard.

## Monitoring

Monitor your deployment:
- **Vercel Dashboard** → **Deployments** - View deployment logs
- **Vercel Dashboard** → **Analytics** - View function metrics
- **Vercel Dashboard** → **Functions** - View function logs

## Next Steps

1. Test all endpoints
2. Configure custom domain (if needed)
3. Set up monitoring/alerts
4. Update documentation with production URLs

