# Vercel Server - Summary

## What Was Created

A fully functional Vercel-compatible serverless deployment of the MCP HTTP Server.

### Directory Structure

```
vercel-server/
├── api/                          # Vercel serverless functions
│   ├── index.ts                 # Root route (/) - MCP discovery
│   ├── sse.ts                   # SSE endpoint (/sse) - MCP transport
│   ├── mcp-manifest.ts          # Manifest endpoint (/mcp-manifest.json)
│   ├── tools.ts                 # List tools endpoint (/tools)
│   ├── tools/
│   │   └── [toolName].ts        # Dynamic tool execution (/tools/:toolName)
│   ├── healthz.ts               # Health check (/healthz)
│   └── healthz/
│       └── ready.ts             # Readiness probe (/healthz/ready)
├── lib/                          # Shared utilities
│   ├── utils.ts                 # Utility functions (DEMO_MODE, getProductionUrl, etc.)
│   ├── schemas.ts               # Zod validation schemas
│   ├── cors.ts                  # CORS handling
│   └── tools/                   # Tool implementations
│       ├── shopify.ts           # Shopify product search
│       └── stripe.ts            # Stripe checkout
├── vercel.json                  # Vercel configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Project documentation
├── DEPLOYMENT.md                # Detailed deployment guide
└── QUICKSTART.md                # Quick start guide
```

## Key Features

1. **Serverless Functions**: All routes converted to Vercel serverless functions
2. **SSE Support**: Properly configured SSE endpoint with no buffering
3. **Runtime Configuration**: Node.js 18.x runtime for all functions
4. **CORS Handling**: Proper CORS headers for all endpoints
5. **Environment Variables**: Support for all required env vars
6. **Type Safety**: Full TypeScript support with Zod validation

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET, POST | MCP discovery metadata |
| `/sse` | GET | SSE endpoint for MCP transport |
| `/mcp-manifest.json` | GET | MCP manifest |
| `/tools` | GET | List available tools |
| `/tools/:toolName` | POST | Execute a tool |
| `/healthz` | GET | Health check |
| `/healthz/ready` | GET | Readiness probe |

## Environment Variables

Required for production:

- `SHOPIFY_STORE_URL` - Shopify store domain
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API token
- `STRIPE_SECRET_KEY` - Stripe secret key
- `DEMO_MODE` - Set to `false` for production
- `MCP_SERVER_URL` - Your Vercel deployment URL
- `NEXT_PUBLIC_SITE_URL` - Frontend URL (for Stripe redirects)
- `ALLOWED_ORIGINS` - Optional CORS origins

## Next Steps

1. **Install dependencies**: `cd vercel-server && npm install`
2. **Deploy**: `vercel` (preview) or `vercel --prod` (production)
3. **Set environment variables** in Vercel dashboard
4. **Update MCP_SERVER_URL** after first deployment
5. **Verify**: Test all endpoints

See [QUICKSTART.md](./QUICKSTART.md) for step-by-step instructions.

