# MCP HTTP Server

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-green?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](https://vercel.com)
[![Version](https://img.shields.io/badge/version-v0.1.1-green.svg)](CHANGELOG.md)

A Model Context Protocol (MCP) HTTP server that exposes tools via REST endpoints for ChatGPT Apps and other MCP-compatible clients.

## What This Is

A production-ready MCP server that provides:
- **RESTful API** for exposing MCP tools to ChatGPT Apps
- **Commerce integrations** (Shopify, Stripe) with demo mode support
- **Security-first architecture** with input validation, error taxonomy, correlation IDs, and idempotency
- **Production-ready patterns** including health probes, structured logging, and comprehensive error handling

## Features

- ✅ RESTful API for MCP tools
- ✅ SSE endpoint for MCP transport (`/sse`)
- ✅ Health check endpoint (`/healthz`) and ready probe (`/healthz/ready`)
- ✅ Type-safe with TypeScript
- ✅ Input/output validation with Zod
- ✅ Correlation ID tracking (request tracing)
- ✅ Error envelopes with taxonomy
- ✅ Strict CORS configuration
- ✅ Idempotency key support
- ✅ Demo mode support

## Quick Start

### Prerequisites

- Node.js 20+
- Vercel account (for deployment)

### Local Development

```bash
# Install dependencies
npm install

# Run local development (if using Vercel CLI)
cd vercel-server
npm install
vercel dev
```

### Deployment to Vercel

See [vercel-server/DEPLOYMENT.md](./vercel-server/DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy:**

```bash
cd vercel-server
npm install
vercel --prod
```

## API Endpoints

### Root
```
GET /
```
Returns MCP discovery metadata.

### SSE Endpoint
```
GET /sse
```
Server-Sent Events endpoint for MCP transport.

### MCP Manifest
```
GET /mcp-manifest.json
```
Returns the MCP manifest describing all available tools.

### List Tools
```
GET /tools
```
Returns list of available MCP tools.

### Execute Tool
```
POST /tools/{toolName}
Content-Type: application/json
X-Correlation-ID: <optional>
X-Idempotency-Key: <optional>

{
  "params": {
    "key": "value"
  }
}
```

### Health Check
```
GET /healthz
```
Returns server status.

### Ready Probe
```
GET /healthz/ready
```
Returns readiness status.

## Available Tools

- `ping` - Connectivity test
- `shopify.searchProducts` - Search products in Shopify store
- `stripe.createCheckoutSession` - Create Stripe Checkout Session (legacy API)
- `stripe_create_checkout_session` - Create Stripe checkout session with product name and price
- `stripe_get_payment_status` - Get payment status for a payment intent

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_STORE_URL` | Shopify store domain | Yes* |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token | Yes* |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes* |
| `DEMO_MODE` | Enable demo mode (mock responses) | Yes |
| `MCP_SERVER_URL` | Public MCP server URL | Yes |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL (for Stripe redirects) | Recommended |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Optional |

*Required unless `DEMO_MODE=true`

## Demo Mode vs Live Mode

### Demo Mode (`DEMO_MODE=true`)

- Returns mock responses for all tools
- No API keys required
- Perfect for demos, testing, and development

### Live Mode (`DEMO_MODE=false`)

- Connects to real APIs (Shopify, Stripe)
- Requires API keys in environment variables
- Real implementations in `vercel-server/lib/tools/`

## Project Structure

```
.
├── vercel-server/          # Vercel deployment
│   ├── api/               # Serverless functions
│   │   ├── index.ts      # Root route
│   │   ├── sse.ts        # SSE endpoint
│   │   ├── mcp-manifest.ts
│   │   ├── tools.ts      # List tools
│   │   ├── tools/[toolName].ts
│   │   └── healthz.ts
│   ├── lib/              # Shared utilities
│   │   ├── utils.ts
│   │   ├── schemas.ts
│   │   ├── cors.ts
│   │   └── tools/        # Tool implementations
│   │       ├── shopify.ts
│   │       └── stripe.ts
│   ├── vercel.json       # Vercel configuration
│   └── package.json
├── CHANGELOG.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Security

- **Security Headers** - Comprehensive security headers
- **Strict CORS** - Environment-based origin allowlist
- **Input/Output Validation** - Zod schemas for all requests/responses
- **Error Taxonomy** - Standardized error codes
- **Correlation IDs** - Request tracing for audit trails
- **Idempotency Keys** - Prevents duplicate operations

See [SECURITY.md](./SECURITY.md) for detailed security practices.

## License

MIT - See [LICENSE](LICENSE) file for details.
