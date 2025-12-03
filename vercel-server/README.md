# MCP HTTP Server - Vercel Deployment

This directory contains the Vercel-compatible serverless functions for the MCP HTTP Server (Streamable HTTP, SSE disabled).

## Structure

```
vercel-server/
├── api/                    # Vercel serverless functions
│   ├── server.ts          # MCP handler (Streamable HTTP at /mcp -> /api/server)
│   ├── healthz.ts         # Liveness probe
│   └── healthz/ready.ts   # Readiness probe
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

- `DEMO_MODE` - Set to `false` for production (or `true` for mocks)
- `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` - Shopify store domain/subdomain
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API token
- `SHOPIFY_API_VERSION` - Optional API version (default `2024-10`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `MCP_SERVER_URL` - Optional override for the public MCP URL
- `NEXT_PUBLIC_SITE_URL` - Frontend URL for Stripe redirects
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Local Development

```bash
# Install dependencies
npm install

# Run Vercel dev server
npm run dev   # runs `vercel dev` with /mcp rewrite

# Type check
npm run typecheck
```

## Deployment

See `DEPLOYMENT.md` for step-by-step deployment instructions.
