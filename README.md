# MCP HTTP Server

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](https://vercel.com)
[![Version](https://img.shields.io/badge/version-v0.1.1-green.svg)](CHANGELOG.md)

A Vercel-hosted Model Context Protocol (MCP) server that exposes commerce tools over MCP's HTTP transport (Streamable HTTP with SSE enabled via Redis for session state).

## What This Is

- **MCP transport on `/api/server`** (catch-all rewrite; `/mcp` also works) using `mcp-handler` with Streamable HTTP and SSE enabled via Redis for session state
- **Serverless by default** on Vercel (Node.js 22 runtime, 60s max for MCP handler)
- **Commerce tools** for Shopify search and Stripe checkout/payment status
- **TypeScript + Zod** input/output validation across handlers
- **Health and readiness probes** for monitoring (`/api/healthz`, `/api/healthz/ready`)
- **Strict CORS allowlist** with normalized origin matching

## Demo

![ChatGPT searching Shopify products via MCP](vercel-server/docs/images/shopify-search.png)

## Quick Start

### Prerequisites

- Node.js 22+
- Vercel CLI installed (`npm i -g vercel`)

### Local Development

```bash
cd vercel-server
npm install
npm run dev   # runs `vercel dev` with the MCP route rewrite
```

### Deploy to Vercel

```bash
cd vercel-server
npm install
vercel --prod
```

See `vercel-server/DEPLOYMENT.md` if you need a step-by-step guide for setting env vars in the Vercel dashboard.

## MCP Endpoint

- **Base path:** `/api/server` (catch-all rewrite from root)
- **Methods:** `GET`, `POST`, `DELETE` (per `mcp-handler`)
- **Protocol:** MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`) over HTTP streaming; SSE enabled via Redis for session state.

Example (list tools):

```bash
curl -X POST https://your-deployment.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

## Health Endpoints

- `GET /api/healthz` – liveness check
- `GET /api/healthz/ready` – readiness probe

## Available Tools

- `ping` — simple connectivity test (`name` optional)
- `shopify_search_products` — search Shopify products (`query`, optional `limit`)
- `stripe_create_checkout_session` — simple checkout by product name/price (`productName`, `price`, optional `currency`, optional `successUrl`/`cancelUrl`)
- `stripe_create_checkout_session_legacy` — checkout using Stripe price IDs (`items[] { priceId, quantity }`, `successUrl`, `cancelUrl`)
- `stripe_get_payment_status` — fetch payment intent status (`paymentIntentId`)

Demo mode (`DEMO_MODE=true`) returns mock data for all tools and requires no API keys.

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `REDIS_URL` | Redis connection string (required for SSE session state) | Yes |
| `DEMO_MODE` | Enable mock responses (default: `false`) | Optional |
| `SHOPIFY_STORE_URL` or `SHOPIFY_SHOP` | Shopify store domain/subdomain | Yes* |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token | Yes* |
| `SHOPIFY_API_VERSION` | Shopify API version (default `2024-10`) | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes* |
| `MCP_SERVER_URL` | Public MCP server URL override | Optional |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL for checkout redirects | Recommended |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Optional |

*Required unless `DEMO_MODE=true`.

## Project Structure

```
.
├── vercel-server/
│   ├── api/
│   │   ├── server.ts          # MCP handler (catch-all rewrite)
│   │   ├── healthz.ts         # Liveness probe
│   │   └── healthz/
│   │       └── ready.ts       # Readiness probe
│   ├── lib/
│   │   ├── cors.ts            # CORS allowlist + preflight handling
│   │   ├── schemas.ts         # Zod schemas
│   │   ├── utils.ts           # Helper utilities (URLs, errors)
│   │   └── tools/             # Tool implementations
│   │       ├── shopify.ts
│   │       └── stripe.ts
│   ├── vercel.json            # Catch-all rewrite to /api/server
│   └── package.json
├── CHANGELOG.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Security

- **CORS allowlist** built from ChatGPT origins, optional frontend URL, and env overrides
- **Validated inputs/outputs** via Zod for health responses and tool payloads

## License

MIT - See [LICENSE](LICENSE) for details.
