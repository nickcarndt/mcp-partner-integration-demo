# Partner Integration Guide

This guide explains how to integrate the MCP HTTP Server with ChatGPT and other MCP-compatible clients.

## Overview

The MCP HTTP Server provides a RESTful API for Model Context Protocol (MCP) tools, enabling ChatGPT Apps and other integrations to interact with commerce platforms (Shopify, Stripe) through a standardized interface.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│   ChatGPT   │────────▶│  MCP HTTP Server │────────▶│   Shopify    │
│     App     │  HTTPS  │  (Cloud Run)     │  REST   │   Stripe     │
└─────────────┘         └──────────────────┘         └──────────────┘
                              │
                              │ HTTPS
                              ▼
                         ┌─────────────┐
                         │   Next.js   │
                         │  (Vercel)   │
                         │ Success/    │
                         │ Cancel Pages│
                         └─────────────┘
```

## Connecting ChatGPT to the MCP Server

### Step 1: Get Your MCP Server URL

After deploying to Cloud Run, your MCP server will have a URL like:
```
https://mcp-http-server-xxxxx.run.app
```

### Step 2: Access the MCP Manifest

The MCP manifest is available at:
```
https://your-mcp-server.run.app/mcp-manifest.json
```

This manifest describes all available tools and their parameters.

### Step 3: Configure ChatGPT

1. In ChatGPT, navigate to your App settings
2. Add the MCP server URL: `https://your-mcp-server.run.app`
3. ChatGPT will automatically fetch the manifest and discover available tools

## Available Tools

### 1. `ping`
**Description:** Connectivity test tool

**Parameters:**
- `name` (optional): Name to greet

**Example:**
```json
{
  "params": {
    "name": "ChatGPT"
  }
}
```

### 2. `shopify.searchProducts`
**Description:** Search products in Shopify store

**Parameters:**
- `query` (required): Search query (searches in product title, vendor, and type)
- `limit` (optional): Maximum number of products to return (default: 10)

**Example:**
```json
{
  "params": {
    "query": "Red Hoodie",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "ok": true,
  "products": [
    {
      "id": "14838844457323",
      "title": "Red Hoodie",
      "price": "54.99",
      "vendor": "mcp-commerce-demo",
      "productType": "",
      "status": "active"
    }
  ],
  "total": 1,
  "query": "Red Hoodie"
}
```

### 3. `stripe_create_checkout_session`
**Description:** Create Stripe checkout session with product name and price

**Parameters:**
- `productName` (required): Name of the product being purchased
- `price` (required): Price in cents (e.g., 4999 for $49.99)
- `currency` (optional): Currency code (default: "usd")

**Example:**
```json
{
  "params": {
    "productName": "Blue Hoodie",
    "price": 4999,
    "currency": "usd"
  }
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_...",
  "payment_intent": null
}
```

**Note:** The checkout URL redirects to Stripe's payment page. After payment, users are redirected to the success page configured via `NEXT_PUBLIC_SITE_URL`.

### 4. `stripe_get_payment_status`
**Description:** Get payment status for a payment intent

**Parameters:**
- `paymentIntentId` (required): Stripe payment intent ID

**Example:**
```json
{
  "params": {
    "paymentIntentId": "pi_1234567890"
  }
}
```

**Response:**
```json
{
  "status": "succeeded",
  "amount": 4999,
  "currency": "usd"
}
```

## API Endpoints

### Base URL
```
https://your-mcp-server.run.app
```

### Tool Execution
```
POST /tools/{toolName}
Content-Type: application/json

{
  "params": { ... }
}
```

### Health Check
```
GET /healthz
```

### MCP Manifest
```
GET /mcp-manifest.json
```

### List Tools
```
GET /tools
```

## Authentication

Currently, the MCP server does not require authentication for public tool access. In production, you may want to:

1. Add API key authentication
2. Implement OAuth 2.0
3. Use Cloud Run's built-in authentication

## CORS Configuration

The server is configured to allow requests from:
- `https://chat.openai.com`
- `https://chatgpt.com`
- Your Next.js frontend URL (from `NEXT_PUBLIC_SITE_URL`)
- Localhost for development

To add additional origins, set the `ALLOWED_ORIGINS` environment variable:
```
ALLOWED_ORIGINS=https://example.com,https://another-domain.com
```

## Error Handling

All errors follow a consistent format:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "correlationId": "uuid-here"
  }
}
```

### Error Codes

- `BAD_PARAMS`: Invalid request parameters
- `BAD_JSON`: Malformed JSON body
- `UNKNOWN_TOOL`: Tool not found
- `CORS_BLOCKED`: Origin not allowed
- `TIMEOUT`: Request timeout
- `UPSTREAM_4XX`: Upstream API error (4xx)
- `UPSTREAM_5XX`: Upstream API error (5xx)
- `INTERNAL_ERROR`: Internal server error

## Security Considerations

1. **HTTPS Only**: The server only accepts HTTPS connections in production
2. **Input Validation**: All inputs are validated using Zod schemas
3. **CORS**: Strict origin checking prevents unauthorized access
4. **Security Headers**: Helmet.js provides security headers
5. **Secrets Management**: Use Google Cloud Secret Manager for API keys

## Deployment

### Cloud Run Deployment

See `deploy-cloudrun.sh` for automated deployment:

```bash
./deploy-cloudrun.sh PROJECT_ID REGION SERVICE_NAME NEXT_PUBLIC_SITE_URL
```

### Environment Variables

Required environment variables in Cloud Run:
- `DEMO_MODE=false`
- `SHOPIFY_STORE_URL` (from Secret Manager)
- `SHOPIFY_ACCESS_TOKEN` (from Secret Manager)
- `STRIPE_SECRET_KEY` (from Secret Manager)
- `NEXT_PUBLIC_SITE_URL` (your Vercel URL)

### Next.js Frontend Deployment

Deploy to Vercel:
1. Connect your repository
2. Set environment variables:
   - `NEXT_PUBLIC_MCP_SERVER_URL`: Your Cloud Run URL
   - `NEXT_PUBLIC_SITE_URL`: Auto-set by Vercel
3. Deploy

## Testing

### Local Testing

1. Start the MCP server:
```bash
DEMO_MODE=false npm run dev
```

2. Start the Next.js frontend:
```bash
cd frontend
npm run dev
```

3. Test tools via curl:
```bash
curl -k -X POST https://localhost:8443/tools/shopify.searchProducts \
  -H "Content-Type: application/json" \
  -d '{"params": {"query": "test", "limit": 5}}'
```

### Production Testing

1. Verify the manifest is accessible:
```bash
curl https://your-mcp-server.run.app/mcp-manifest.json
```

2. Test tool execution:
```bash
curl -X POST https://your-mcp-server.run.app/tools/ping \
  -H "Content-Type: application/json" \
  -d '{"params": {"name": "Test"}}'
```

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Verify your origin is in `ALLOWED_ORIGINS`
2. Check that `NEXT_PUBLIC_SITE_URL` is set correctly
3. Ensure ChatGPT origins are allowed (they are by default)

### Tool Not Found

If ChatGPT can't find tools:
1. Verify `/mcp-manifest.json` is accessible
2. Check the manifest format is valid JSON
3. Ensure all required fields are present

### Stripe Checkout Not Working

If checkout URLs don't work:
1. Verify `NEXT_PUBLIC_SITE_URL` is set in Cloud Run
2. Check that the Next.js app is deployed and accessible
3. Verify Stripe keys are correct

## Support

For issues or questions:
1. Check the logs in Cloud Run
2. Review error responses (they include correlation IDs)
3. Verify environment variables are set correctly

## Next Steps

1. **Add Authentication**: Implement API key or OAuth authentication
2. **Add More Tools**: Extend with additional commerce integrations
3. **Monitoring**: Set up Cloud Monitoring and alerting
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **Caching**: Implement caching for frequently accessed data

