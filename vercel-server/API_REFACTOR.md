# API Refactor Summary

## Changes Made

All serverless functions have been refactored to use pure Vercel APIs (no Express) and optimized for Node.js runtime.

### 1. `api/server.ts` - MCP Handler

- Single entrypoint for MCP Streamable HTTP (`/mcp` -> `/api/server` via `vercel.json`)
- Uses `mcp-handler` with `initialize`, `tools/list`, and `tools/call`
- Registers tools: `ping`, `shopify_search_products`, `stripe_create_checkout_session`, `stripe_create_checkout_session_legacy`, `stripe_get_payment_status`
- SSE is disabled; transport is Streamable HTTP only
- Node.js 22 runtime with 300s maxDuration

### 2. Health Endpoints

- `api/healthz.ts` - Liveness probe with CORS handling
- `api/healthz/ready.ts` - Readiness probe with CORS handling
- Both validated with Zod schemas

### 5. Removed

- All Express dependencies
- All Cloud Run/GCP references
- Edge runtime configurations
- Complex CORS library usage (simplified to direct header setting)

## Routing

Vercel routes `/mcp` to `/api/server` via `vercel.json` rewrite:
- `/mcp` → `/api/server` (GET/POST/DELETE per `mcp-handler`)
- `/api/healthz`
- `/api/healthz/ready`

## Environment Variables

Functions use:
- `DEMO_MODE` - Demo mode flag
- `MCP_SERVER_URL` - Optional public URL override
- `SHOPIFY_STORE_URL` / `SHOPIFY_SHOP`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`

## Performance

- Streamable HTTP transport via `mcp-handler`
- Strict CORS allowlist and normalized origin matching
- Zod validation for health responses and tool schemas
