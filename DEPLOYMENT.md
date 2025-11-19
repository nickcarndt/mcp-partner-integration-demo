# Deployment Guide

This guide covers deploying the MCP HTTP Server to production for ChatGPT integration.

## Architecture

- **MCP Server**: Google Cloud Run (HTTPS, auto-scaling)
- **Frontend**: Vercel (Next.js success/cancel pages)
- **Integration**: ChatGPT connects via MCP manifest

## Prerequisites

1. Google Cloud Project with billing enabled
2. Vercel account
3. Stripe account (test mode)
4. Shopify store (or test store)

## Step 1: Deploy MCP Server to Cloud Run

### 1.1 Set Up Google Cloud

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 1.2 Create Secrets in Secret Manager

```bash
# Create secrets
echo -n "mcp-commerce-demo.myshopify.com" | gcloud secrets create shopify-store-url --data-file=-
echo -n "shpat_your_token" | gcloud secrets create shopify-access-token --data-file=-
echo -n "sk_test_your_key" | gcloud secrets create stripe-secret-key --data-file=-
```

### 1.3 Build and Deploy

```bash
# Build the application
npm ci
npm run build

# Build Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/mcp-http-server:latest .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/mcp-http-server:latest

# Deploy to Cloud Run
gcloud run deploy mcp-http-server \
  --image gcr.io/YOUR_PROJECT_ID/mcp-http-server:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "DEMO_MODE=false,PORT=8080" \
  --set-secrets "SHOPIFY_STORE_URL=shopify-store-url:latest,SHOPIFY_ACCESS_TOKEN=shopify-access-token:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest" \
  --project YOUR_PROJECT_ID
```

### 1.4 Get Your MCP Server URL

```bash
gcloud run services describe mcp-http-server \
  --region us-central1 \
  --format 'value(status.url)'
```

Save this URL - you'll need it for the Next.js frontend.

### 1.5 Update Environment Variables

After deploying the Next.js frontend (Step 2), update Cloud Run with the Vercel URL:

```bash
gcloud run services update mcp-http-server \
  --region us-central1 \
  --update-env-vars "NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app"
```

## Step 2: Deploy Next.js Frontend to Vercel

### 2.1 Install Vercel CLI

```bash
npm i -g vercel
```

### 2.2 Deploy

```bash
cd frontend
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set environment variables:
  - `NEXT_PUBLIC_MCP_SERVER_URL`: Your Cloud Run URL (from Step 1.4)
  - `NEXT_PUBLIC_SITE_URL`: Will be auto-set by Vercel

### 2.3 Update Cloud Run with Vercel URL

After Vercel deployment, update Cloud Run:

```bash
gcloud run services update mcp-http-server \
  --region us-central1 \
  --update-env-vars "NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app"
```

## Step 3: Connect ChatGPT

### 3.1 Get MCP Manifest URL

Your MCP manifest is at:
```
https://your-mcp-server.run.app/mcp-manifest.json
```

### 3.2 Configure ChatGPT

1. Open ChatGPT
2. Navigate to your App settings
3. Add MCP server: `https://your-mcp-server.run.app`
4. ChatGPT will automatically discover tools from the manifest

### 3.3 Test Integration

Try these commands in ChatGPT:
- "Search for products in my store"
- "Create a checkout session for a Blue Hoodie at $49.99"

## Verification Checklist

- [ ] MCP server is accessible at Cloud Run URL
- [ ] `/mcp-manifest.json` returns valid JSON
- [ ] `/healthz` returns `{"ok": true}`
- [ ] Next.js app is deployed to Vercel
- [ ] Success page loads at `https://your-vercel-app.vercel.app/success`
- [ ] Cancel page loads at `https://your-vercel-app.vercel.app/cancel`
- [ ] `NEXT_PUBLIC_SITE_URL` is set in Cloud Run
- [ ] ChatGPT can connect and see tools

## Troubleshooting

### CORS Errors

If ChatGPT can't connect:
1. Verify `NEXT_PUBLIC_SITE_URL` is set in Cloud Run
2. Check that ChatGPT origins are allowed (they are by default)
3. Review Cloud Run logs for CORS errors

### Stripe Checkout Not Redirecting

If checkout doesn't redirect to success page:
1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly in Cloud Run
2. Check Stripe dashboard for session creation
3. Verify Next.js app is accessible

### Tools Not Appearing in ChatGPT

If tools don't appear:
1. Verify `/mcp-manifest.json` is accessible
2. Check manifest format is valid
3. Review Cloud Run logs for errors

## Monitoring

### Cloud Run Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mcp-http-server" --limit 50
```

### Vercel Logs

View logs in Vercel dashboard under your project's "Logs" tab.

## Security Notes

1. **Secrets**: Never commit API keys. Use Secret Manager.
2. **HTTPS**: Both Cloud Run and Vercel provide HTTPS automatically.
3. **CORS**: Only allow trusted origins.
4. **Rate Limiting**: Consider adding rate limiting for production.

## Cost Estimation

- **Cloud Run**: Pay per request, ~$0.40 per million requests
- **Vercel**: Free tier includes 100GB bandwidth/month
- **Stripe**: Test mode is free
- **Shopify**: Depends on your plan

## Next Steps

1. Set up monitoring and alerting
2. Add authentication if needed
3. Implement rate limiting
4. Add more tools as needed
5. Set up CI/CD pipeline

