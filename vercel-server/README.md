# MCP HTTP Server - Vercel Deployment

This directory contains the Vercel-compatible serverless functions for the MCP HTTP Server.

## Structure

```
vercel-server/
├── api/                    # Vercel serverless functions
│   ├── index.ts           # Root route (MCP discovery)
│   ├── sse.ts             # SSE endpoint for MCP transport
│   ├── mcp-manifest.ts    # MCP manifest endpoint
│   ├── tools.ts           # List tools endpoint
│   ├── tools/
│   │   └── [toolName].ts  # Dynamic tool execution endpoint
│   └── healthz.ts         # Health check endpoint
├── lib/                    # Shared utilities
│   ├── utils.ts           # Utility functions
│   ├── schemas.ts         # Zod validation schemas
│   ├── cors.ts            # CORS handling
│   └── tools/             # Tool implementations
│       ├── shopify.ts     # Shopify product search
│       └── stripe.ts      # Stripe checkout
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Environment Variables

Required environment variables (set in Vercel dashboard):

- `SHOPIFY_STORE_URL` - Shopify store domain
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API token
- `STRIPE_SECRET_KEY` - Stripe secret key
- `DEMO_MODE` - Set to `false` for production
- `MCP_SERVER_URL` - Your Vercel deployment URL (set after first deployment)
- `NEXT_PUBLIC_SITE_URL` - Frontend URL for Stripe redirects
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Local Development

```bash
# Install dependencies
npm install

# Run Vercel dev server
npm run dev

# Type check
npm run typecheck
```

## Deployment

See `DEPLOYMENT.md` for step-by-step deployment instructions.

