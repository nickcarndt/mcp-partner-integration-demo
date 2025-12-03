# Final Project Structure

## Complete File Tree

```
mcp-http-server/
├── vercel-server/                    # Vercel deployment (main codebase)
│   ├── api/                          # Serverless functions
│   │   ├── server.ts                 # MCP handler (Streamable HTTP, /mcp -> /api/server)
│   │   ├── healthz.ts                # Health check
│   │   └── healthz/
│   │       └── ready.ts              # Readiness probe
│   ├── lib/                           # Shared utilities
│   │   ├── utils.ts                  # Utility functions
│   │   ├── schemas.ts                # Zod validation schemas
│   │   ├── cors.ts                   # CORS handling
│   │   └── tools/                    # Tool implementations
│   │       ├── shopify.ts           # Shopify product search
│   │       └── stripe.ts            # Stripe checkout
│   ├── vercel.json                   # Vercel configuration
│   ├── package.json                  # Vercel dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── .gitignore                    # Git ignore rules
│   ├── README.md                     # Vercel deployment docs
│   ├── DEPLOYMENT.md                 # Detailed deployment guide
│   ├── QUICKSTART.md                 # Quick start guide
│   └── SUMMARY.md                    # Project summary
├── scripts/
│   └── release-notes.js              # Release notes generator
├── CHANGELOG.md                      # Version history
├── LICENSE                           # MIT license
├── README.md                         # Main project README
├── SECURITY.md                       # Security best practices
├── CLEANUP_SUMMARY.md                # Cleanup documentation
├── FINAL_STRUCTURE.md                # This file
├── package.json                      # Root package.json
├── package-lock.json                 # Dependency lock
├── tsconfig.json                     # Root TypeScript config
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── .gitignore                        # Git ignore rules
├── .env.example                      # Environment variable template
└── .env                              # Local environment (not committed)
```

## Key Directories

### `vercel-server/` - Main Codebase
All production code lives here. This is what gets deployed to Vercel.

**API Routes:**
- `api/server.ts` - MCP handler at `/mcp` (Streamable HTTP, SSE disabled)
- `api/healthz.ts` - Health check
- `api/healthz/ready.ts` - Readiness probe

**Shared Libraries:**
- `lib/utils.ts` - Utility functions (DEMO_MODE, getProductionUrl, etc.)
- `lib/schemas.ts` - Zod validation schemas
- `lib/cors.ts` - CORS handling
- `lib/tools/shopify.ts` - Shopify integration
- `lib/tools/stripe.ts` - Stripe integration

### Root Files
- `README.md` - Project overview and quick start
- `SECURITY.md` - Security best practices
- `CHANGELOG.md` - Version history
- `package.json` - Root dependencies (minimal, mostly for tooling)

## Deployment

Deploy to Vercel:

```bash
cd vercel-server
npm install
vercel --prod
```

See `vercel-server/DEPLOYMENT.md` for detailed instructions.

## Environment Variables

Set in Vercel dashboard:

- `DEMO_MODE` - `false` for production (or `true` for mocks)
- `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` - Shopify store domain/subdomain
- `SHOPIFY_ACCESS_TOKEN` - Shopify Admin API token
- `SHOPIFY_API_VERSION` - Optional API version (default `2024-10`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `MCP_SERVER_URL` - Optional public MCP URL override
- `NEXT_PUBLIC_SITE_URL` - Frontend URL (optional, used for Stripe redirects)
- `ALLOWED_ORIGINS` - CORS origins (optional)

## What Was Removed

- ✅ All Google Cloud / Cloud Run files
- ✅ All Cloudflare tunnel files
- ✅ Frontend directory
- ✅ Old Express server code (`src/`)
- ✅ Test files and configs
- ✅ Build artifacts (`dist/`, `certs/`)
- ✅ Obsolete documentation
- ✅ Deployment scripts
- ✅ Docker files

## Project Status

✅ **Clean, minimal, production-ready**
✅ **Fully aligned for Vercel deployment**
✅ **No obsolete or duplicate code**
✅ **Clear structure and documentation**
