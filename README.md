# MCP HTTP Server

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](https://vercel.com)
[![Version](https://img.shields.io/badge/version-v0.1.1-green.svg)](https://github.com/nickcarndt/mcp-partner-integration-demo/releases)

A lightweight, production-ready MCP server for commerce workflows.
Deployed on Vercel and integrated with Shopify and Stripe through custom MCP tools.

This server enables ChatGPT (and other MCP clients) to search Shopify inventory, create Stripe Checkout Sessions, and retrieve payment status through simple natural-language requests.

## Demo

### Shopify Search via MCP

ChatGPT calling the `shopify_search_products` tool and returning live store inventory.

![ChatGPT searching Shopify products via MCP](vercel-server/docs/images/shopify-search.png)

*End-to-end MCP tool invocation via ChatGPT.*

### Stripe Checkout Session via MCP

ChatGPT creating a Stripe Checkout Session using the `stripe_create_checkout_session` tool.

![ChatGPT creating Stripe checkout session](vercel-server/docs/images/stripe-checkout.png)

*Hosted Stripe Checkout created directly through MCP.*

## Features

- MCP HTTP transport at `/api/server` with `/mcp` rewrite
- Streamable HTTP + SSE session state (Redis-backed)
- Commerce tools: Shopify product search, Stripe Checkout creation, and payment status retrieval
- Serverless on Vercel (Node.js 22, 60s max execution time)
- Strict Zod schemas for all tool inputs/outputs
- Health and readiness endpoints (`/api/healthz`, `/api/healthz/ready`)
- CORS allowlist optimized for ChatGPT connectors

## Quick Start

### Prerequisites

- Node.js 22+
- Vercel CLI installed (`npm i -g vercel`)

### Local Development

```bash
cd vercel-server
npm install
npm run dev
```

### Deploy to Vercel

```bash
cd vercel-server
npm install
vercel --prod
```

See `vercel-server/DEPLOYMENT.md` for environment setup instructions.

## MCP Endpoint

MCP transport is served at `/api/server` using `mcp-handler`, with Streamable HTTP and optional SSE-based session state (Redis).

- **Base path:** `/api/server` (rewritten from `/mcp`)
- **Methods:** `GET`, `POST`, `DELETE`

Example — list tools:

```bash
curl -X POST https://mcp-partner-integration-demo.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

**Sanity check:**
```bash
curl -X POST https://mcp-partner-integration-demo.vercel.app/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

## Health Endpoints

- `GET /api/healthz` — liveness check
- `GET /api/healthz/ready` — readiness probe

## Available Tools

| Tool | Description |
|------|-------------|
| `ping` | Connectivity + MCP handshake verification |
| `shopify_search_products` | Search Shopify Admin API products |
| `stripe_create_checkout_session` | Create a Stripe Checkout Session (price interpreted as USD dollars) |
| `stripe_create_checkout_session_legacy` | Create sessions using existing Stripe Price IDs |
| `stripe_get_payment_status` | Retrieve PaymentIntent status |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `REDIS_URL` | Redis connection string (for SSE session state) | Yes |
| `SHOPIFY_STORE_URL` / `SHOPIFY_SHOP` | Shopify store domain/subdomain | Yes |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token | Yes |
| `SHOPIFY_API_VERSION` | Defaults to `2024-10` | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `MCP_SERVER_URL` | Base MCP server URL (no `/mcp` suffix) | Optional |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL for checkout redirects | Recommended |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist | Optional |

## Project Structure

```
.
├── vercel-server/
│   ├── api/
│   │   ├── server.ts
│   │   ├── healthz.ts
│   │   └── healthz/ready.ts
│   ├── lib/
│   │   ├── cors.ts
│   │   ├── schemas.ts
│   │   ├── utils.ts
│   │   └── tools/
│   │       ├── shopify.ts
│   │       └── stripe.ts
│   ├── vercel.json
│   └── package.json
├── CHANGELOG.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Security

- **CORS allowlist** tuned for ChatGPT + optional frontend origins
- **Strict Zod validation** for every tool and endpoint
- **No unauthenticated commerce actions** outside MCP tool boundaries

## Troubleshooting

### Redis/Upstash

**Symptom:** `/api/healthz/ready` returns 503 or MCP tools fail with "Redis unavailable"

**Cause:** Upstash free tier may delete inactive databases after ~2 weeks of inactivity

**Fix:**
1. Restore or recreate Redis instance in Upstash dashboard
2. Update `REDIS_URL` environment variable in Vercel
3. Redeploy: `vercel --prod` or trigger redeploy from dashboard
4. Verify: `curl https://your-deployment.vercel.app/api/healthz/ready` should return 200

## Live MCP Endpoint (Demo)

**https://mcp-partner-integration-demo.vercel.app/mcp**

Public, rate-limited, and intended for evaluation/testing.
Not intended for production traffic or large workloads.

**Note:** Set `MCP_SERVER_URL` to the base URL (e.g., `https://mcp-partner-integration-demo.vercel.app`) without the `/mcp` suffix.

## License

MIT — see [LICENSE](LICENSE).
