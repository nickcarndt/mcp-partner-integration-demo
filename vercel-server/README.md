# MCP HTTP Server - Vercel Deployment

A production-ready MCP (Model Context Protocol) server deployed on Vercel with Shopify and Stripe integrations.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mcp-http-server/vercel-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   
   Create a `.env.local` file or set these in Vercel:
   
   **Required:**
   - `REDIS_URL` - Redis connection string (required for SSE support)
   
   **Optional (for Shopify):**
   - `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` - Your Shopify store domain
   - `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API token
   - `SHOPIFY_API_VERSION` - API version (default: `2024-10`)
   
   **Optional (for Stripe):**
   - `STRIPE_SECRET_KEY` - Stripe secret key
   - `NEXT_PUBLIC_SITE_URL` - Frontend URL for redirects
   
   **Optional:**
   - `NODE_ENV` - Set to `production` to disable verbose logs

4. **Test locally**
   ```bash
   npm run dev
   ```
   
   The server will be available at:
   - `http://localhost:3000/mcp` - MCP endpoint
   - `http://localhost:3000/sse` - SSE endpoint

5. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI if needed
   npm i -g vercel
   
   # Deploy
   vercel
   ```
   
   Or connect your GitHub repository in the [Vercel Dashboard](https://vercel.com/dashboard).

## Environment Variables

### Required
- `REDIS_URL` - Redis connection string (e.g., `redis://localhost:6379` or `rediss://...`)

### Optional - Shopify Integration
- `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` - Store domain (e.g., `your-store` or `your-store.myshopify.com`)
- `SHOPIFY_ACCESS_TOKEN` - Admin API access token
- `SHOPIFY_API_VERSION` - API version (default: `2024-10`)

### Optional - Stripe Integration
- `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_`)
- `NEXT_PUBLIC_SITE_URL` - Frontend URL for checkout redirects

### Optional - General
- `NODE_ENV` - Set to `production` to disable verbose logging

## Available Tools

### `ping`
A simple ping tool that returns a greeting message.

**Parameters:**
- `name` (optional): Name to greet

### `shopify_search_products`
Search for products in a Shopify store.

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 10)

### `stripe_create_checkout_session`
Create a Stripe checkout session.

**Parameters:**
- `productName` (required): Product name
- `price` (required): Price in dollars (decimal/number)
- `currency` (optional): Currency code (default: `usd`)
- `successUrl` (optional): Success redirect URL
- `cancelUrl` (optional): Cancel redirect URL

### `stripe_create_checkout_session_legacy`
Create a Stripe checkout session using price IDs (legacy API).

**Parameters:**
- `items` (required): Array of items with `priceId` and `quantity`
- `successUrl` (required): Success redirect URL
- `cancelUrl` (required): Cancel redirect URL

### `stripe_get_payment_status`
Get the payment status for a Stripe payment intent.

**Parameters:**
- `paymentIntentId` (required): Stripe payment intent ID

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run typecheck
```

The server will start on `http://localhost:3000` with endpoints at `/mcp` and `/sse`.

## Deployment

### Deploy to Vercel

1. **Via CLI:**
   ```bash
   vercel
   ```

2. **Via GitHub:**
   - Push your code to GitHub
   - Import the repository in [Vercel Dashboard](https://vercel.com/dashboard)
   - Add environment variables in the project settings
   - Deploy

### Environment Variables in Vercel

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add all required variables (especially `REDIS_URL`)
4. Redeploy if needed

## Project Structure

```
vercel-server/
├── api/
│   ├── server.ts          # Main MCP handler
│   └── healthz/           # Health check endpoints
├── lib/
│   ├── utils.ts           # Utility functions
│   └── tools/             # Tool implementations
│       ├── shopify.ts     # Shopify product search
│       └── stripe.ts      # Stripe checkout
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies
```

## Troubleshooting

### Redis Connection Issues
- Ensure `REDIS_URL` is set correctly
- For local development, you can use a local Redis instance or a service like [Upstash](https://upstash.com/)

### Shopify API Errors
- Verify your `SHOPIFY_ACCESS_TOKEN` has the correct permissions
- Check that `SHOPIFY_STORE_URL` matches your store domain
- Ensure the API version is supported

### Stripe API Errors
- Verify your `STRIPE_SECRET_KEY` is correct
- Check that you're using a valid secret key (not a publishable key)
- Ensure redirect URLs are properly configured

## License

See LICENSE file in the root directory.
