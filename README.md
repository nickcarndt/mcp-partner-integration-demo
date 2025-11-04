# MCP HTTP Server

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-manual-yellow)](https://github.com/yourusername/mcp-http-server)
[![Deploy](https://img.shields.io/badge/deploy-Cloud%20Run-orange)](https://cloud.google.com/run)

A Model Context Protocol (MCP) HTTP server that exposes tools via REST endpoints, designed for multi-agent workflows in Cursor.

## What This Is

This is a production-ready demo server that showcases MCP tool integration for Solutions Architect roles. It demonstrates:
- **RESTful API design** for exposing MCP tools to ChatGPT Apps and other integrations
- **Commerce integrations** (Shopify, Stripe) with mock implementations for demo purposes
- **Security-first architecture** with input validation, error taxonomy, correlation IDs, and idempotency
- **Production-ready patterns** including health probes, structured logging, and comprehensive error handling

## Why It Matters for the Solutions Architect Role

This project maps directly to SA responsibilities:

- **Apps in ChatGPT + Commerce**: Demonstrates MCP tool integration patterns that enable ChatGPT Apps to interact with commerce platforms
- **First-Line Security & Compliance**: Implements security headers, CORS, input validation, error taxonomy, and audit trails (correlation IDs)
- **Enablement Documentation**: Comprehensive docs for partners, developers, and operations teams

See [Solutions Architect Role Mapping](#solutions-architect-role-mapping) for detailed mapping.

## Features

- ✅ RESTful API for MCP tools
- ✅ Health check endpoint (`/healthz`) and ready probe (`/healthz/ready`)
- ✅ Type-safe with TypeScript
- ✅ Input/output validation with Zod (defense-in-depth)
- ✅ Correlation ID tracking (request tracing)
- ✅ Structured logging with Pino
- ✅ Error envelopes with taxonomy
- ✅ Security headers (Helmet)
- ✅ Strict CORS configuration
- ✅ Request timeouts (10s)
- ✅ Idempotency key support
- ✅ Demo mode support
- ✅ Multi-agent workflow support

## Quick Start (HTTPS)

### Prerequisites

- Node.js 20+ (see [Node.js downloads](https://nodejs.org/))
- npm or yarn

### Setup

```bash
./setup.sh
```

This will:
1. Check Node.js version (requires 20+)
2. Install dependencies
3. Generate a self-signed TLS certificate (`cert/localhost.pem` and `cert/localhost-key.pem`)
4. Build TypeScript

### Local HTTPS Setup (Recommended)

**Option 1: Using mkcert (Recommended)**

```bash
# Install mkcert (macOS)
brew install mkcert nss
mkcert -install

# Generate certificate
mkcert -cert-file cert/localhost.pem -key-file cert/localhost-key.pem localhost 127.0.0.1 ::1
```

**Option 2: Using OpenSSL (Fallback)**

The `setup.sh` script automatically falls back to OpenSSL if mkcert is not available.

### Trust the Certificate (One-Time)

**macOS:**
1. Double-click `cert/localhost.pem` to open in Keychain Access
2. Set it to **Always Trust** for SSL
3. Restart your browser

**Windows:**
1. Import `cert/localhost.pem` into "Trusted Root Certification Authorities" via Certificate Manager

**Linux:**
- Certificates are typically trusted automatically, or you may need to add to your system's trust store

### Start the Server

```bash
npm run dev
```

The server will start on:
- **HTTPS:** `https://localhost:8443` (primary endpoint)
- **HTTP:** `http://localhost:8080` (redirects to HTTPS when certificates are present)

### Access the Demo UI

Open `https://localhost:8443` in your browser. The interactive demo UI lets you test all tools.

### MCP Manifest

View the MCP manifest at:
- `https://localhost:8443/mcp-manifest.json`

This manifest can be used by ChatGPT Apps and other MCP clients to discover available tools.

### Quick Links

- **Demo UI:** `https://localhost:8443` (interactive tool testing)
- **MCP Manifest:** `https://localhost:8443/mcp-manifest.json` (tool discovery)
- **Health Check:** `https://localhost:8443/healthz` (server status)
- **Ready Probe:** `https://localhost:8443/healthz/ready` (readiness for orchestration)

### Smoke Tests

```bash
npm run smoke
```

Or manually:
```bash
# Health check
curl -sk https://localhost:8443/healthz | jq

# Ping tool
curl -sk -X POST https://localhost:8443/tools/ping \
  -H 'Content-Type: application/json' \
  -d '{"params":{"name":"Nick"}}' | jq
```

## Demo Mode vs Live Mode

The server supports two modes controlled by the `DEMO_MODE` environment variable:

### Demo Mode (`DEMO_MODE=true`) - Default

- Returns mock responses for all tools
- No API keys required
- Perfect for demos, testing, and development
- Shopify returns sample products
- Stripe returns mock checkout sessions

### Live Mode (`DEMO_MODE=false`)

- Connects to real APIs (Shopify, Stripe)
- Requires API keys in `.env`
- Real implementations must be added to `src/tools/`
- Currently throws errors if tools are called without implementations

**To switch modes:**
1. Edit `.env` and set `DEMO_MODE=true` or `DEMO_MODE=false`
2. Restart the server (`npm run dev`)

## Security & Reliability Checklist

This project implements production-ready security and reliability patterns:

✅ **Security Headers** (Helmet) - X-Content-Type-Options, X-Frame-Options, etc.  
✅ **Strict CORS** - Environment-based origin allowlist  
✅ **Input Validation** - Zod schemas for all request parameters  
✅ **Output Validation** - Zod schemas for all responses (defense-in-depth)  
✅ **Error Taxonomy** - Standardized error codes (BAD_PARAMS, UNKNOWN_TOOL, TIMEOUT, etc.)  
✅ **Correlation IDs** - Request tracing for audit trails  
✅ **Idempotency Keys** - Prevents duplicate operations (e.g., checkout)  
✅ **Request Timeouts** - 10-second timeout prevents resource exhaustion  
✅ **Structured Logging** - Pino for easy log aggregation  
✅ **Health Probes** - `/healthz` and `/healthz/ready` for orchestration  
✅ **HTTPS Support** - Self-signed certificates for local development  

**Note:** CSP and HSTS are relaxed in development mode. See `src/server.ts` for production TODO comments.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for comprehensive troubleshooting.

**Quick fixes:**
- Safari shows a warning → trust `cert/localhost.pem` in Keychain (Always Trust)
- Browser still hits HTTP → go straight to `https://localhost:8443` (8080 redirects when HTTPS is enabled)
- Cross-origin errors → set `ALLOWED_ORIGINS=https://localhost:8443` (or your front-end origin) and restart
- Stripe textarea complains → the UI prints `JSON parse error` messages when payload syntax is invalid
- 500 errors → check `DEMO_MODE=true` in `.env` and restart server

## API Endpoints

### Health Check
```
GET /healthz
```

Returns server status and configuration.

### Ready Probe
```
GET /healthz/ready
```

Returns readiness status for Cloud Run / Kubernetes. Checks dependencies (Redis, DB, etc.) when configured.

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
X-Idempotency-Key: <optional, for checkout>

{
  "params": {
    "key": "value"
  }
}
```

Executes the specified tool with provided parameters.

**Headers:**
- `X-Correlation-ID`: Optional correlation ID for request tracing (auto-generated if not provided)
- `X-Idempotency-Key`: Optional idempotency key for checkout operations (ensures idempotent requests)

## Solutions Architect Role Mapping

This project demonstrates capabilities aligned with a Solutions Architect role:

### Apps in ChatGPT + MCP Tools
- **MCP Tools Integration:** Exposes commerce tools (Shopify product search, Stripe checkout) as MCP tools via REST API
- **Demo UI:** Interactive interface (`https://localhost:8443`) for testing tool integrations
- **MCP Manifest:** `/mcp-manifest.json` provides tool discovery for ChatGPT Apps and other MCP clients
- **Contract Stability:** DEMO_MODE ensures stable contracts when switching to real APIs

### Commerce Checkout
- **Stripe Integration:** Mock checkout session creation with idempotency support
- **Shopify Integration:** Mock product search with pagination
- **Idempotency Keys:** Prevents duplicate charges/orders via `X-Idempotency-Key` header
- **Error Handling:** Standardized error codes for partner integration debugging

### First-Line Security & Compliance
- **Security Headers:** Helmet.js for comprehensive security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **Strict CORS:** Environment-based origin allowlist for cross-origin control
- **Input/Output Validation:** Zod schemas for defense-in-depth validation
- **Error Taxonomy:** Standardized error codes (BAD_PARAMS, UNKNOWN_TOOL, TIMEOUT, etc.) for compliance tracking
- **Correlation IDs:** Request tracing via `X-Correlation-ID` header for security auditing
- **Structured Logging:** Pino for easy log aggregation and compliance reporting

### Enablement Documentation
- **Implementation Guide:** Architecture patterns and conventions (`docs/implementation-guide.md`)
- **FAQ:** Common questions and troubleshooting (`docs/faq.md`)
- **Runbook:** Operational procedures for production (`docs/runbook.md`)
- **Agent Profiles:** Multi-agent workflow documentation (`docs/agent-profiles.md`)
- **Team Commands:** Reusable Cursor commands for consistency (`docs/team-commands.json`)

## Multi-Agent Workflow

This project is configured for multi-agent workflows in Cursor. See:

- **Agent Profiles:** `docs/agent-profiles.md`
- **Team Rules:** `docs/team-rules.md`
- **Team Commands:** `docs/team-commands.json`
- **Implementation Guide:** `docs/implementation-guide.md`
- **FAQ:** `docs/faq.md`
- **Runbook:** `docs/runbook.md`
- **Cursor Workflow:** `CURSOR_WORKFLOW.md` (complete build guide)

### Quick Reference

**Agent Profiles:**
- 🧭 Architect (Planner) – Composer
- 🛠 Implementer (Builder) – Composer
- 🔍 Reviewer (Code Review) – GPT-5 Codex
- ✅ QA (Tests) – Composer

**Workflow:**
1. `plan:feature` (Architect) → approve steps/backout
2. Parallel: `build:feature` (Implementer) + `qa:test` (QA)
3. `review:codex` (Reviewer) → fix → re-review
4. `docify` → push
5. Merge

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```bash
PORT=8080
DEMO_MODE=true
```

### Scripts

- `npm run dev` - Start development server with watch
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type check without emitting
- `npm test` - Run tests
- `npm run fmt` - Format code with Prettier
- `npm run smoke` - Run smoke tests

## Project Structure

```
.
├── src/
│   ├── server.ts          # Main server implementation
│   ├── tools/
│   │   ├── shopify.ts     # Shopify product search tool
│   │   └── stripe.ts      # Stripe checkout session tool
│   └── public/
│       └── demo.html      # Interactive demo UI
├── docs/
│   ├── agent-profiles.md  # Agent profile definitions
│   ├── team-rules.md      # Team rules and guardrails
│   ├── team-commands.json # Reusable commands
│   ├── cursor-setup-guide.md
│   ├── implementation-guide.md
│   ├── faq.md
│   ├── runbook.md
│   └── SUMMARY.md
├── CURSOR_WORKFLOW.md     # Complete Cursor Pro build guide
├── package.json
├── tsconfig.json
├── setup.sh
└── README.md
```

## Development

### Adding New Tools

1. Define Zod schema for parameters
2. Add tool handler to `tools` object
3. Add route handler in server
4. Update documentation

See `docs/implementation-guide.md` for details.

## Security

### Security Headers
The server uses [Helmet](https://helmetjs.github.io/) to set security headers:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (when HTTPS enabled)
- Content-Security-Policy

### CORS
Strict CORS configuration via `ALLOWED_ORIGINS` environment variable:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Input/Output Validation
- **Input validation**: All request parameters validated with Zod schemas
- **Output validation**: All responses validated with Zod schemas (defense-in-depth)
- **Error taxonomy**: Standardized error codes (BAD_PARAMS, UNKNOWN_TOOL, TIMEOUT, UPSTREAM_4XX, UPSTREAM_5XX, etc.)

### Request Timeouts
Global 10-second timeout for all requests to prevent resource exhaustion.

## Reliability

### Correlation IDs
Every request gets a correlation ID for tracing:
- Auto-generated UUID if not provided
- Echoed in response header (`x-correlation-id`)
- Included in all error responses
- Logged with all structured log entries

### Structured Logging
Uses [Pino](https://getpino.io/) for high-performance structured logging:
- JSON format for easy parsing
- Correlation ID included in all log entries
- Configurable log levels via `LOG_LEVEL` env var

### Error Handling
**Error Taxonomy:**
- `BAD_PARAMS` (400): Invalid request parameters
- `UNKNOWN_TOOL` (404): Tool not found
- `NOT_FOUND` (404): Path not found
- `TIMEOUT` (500): Request timeout
- `UPSTREAM_4XX` (502): Upstream service 4xx error
- `UPSTREAM_5XX` (502): Upstream service 5xx error
- `INTERNAL_ERROR` (500): Internal server error

All errors include:
- Error code
- Human-readable message
- Correlation ID
- Optional details object

### Idempotency
Checkout operations support idempotency keys:
- Include `X-Idempotency-Key` header
- Same key returns same result (even in demo mode)
- Prevents duplicate charges/orders

### Health Probes
- `/healthz`: Basic health check (always returns 200 if server is running)
- `/healthz/ready`: Readiness probe (checks dependencies, returns 200 when ready to accept traffic)

## Code Quality

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- Zod for input/output validation
- Vitest for testing (positive and negative cases)

## Testing

### Positive Cases
- Health check returns `ok: true`
- All tools execute successfully
- Correlation IDs are echoed
- Idempotency keys are respected

### Negative Cases
- Bad parameters return 400 with `BAD_PARAMS`
- Unknown tools return 404 with `UNKNOWN_TOOL`
- Invalid JSON returns 400
- Ready probe returns `ok: true, ready: true`

Run tests:
```bash
npm test
```

## Deployment

### Cloud Run

The project includes a `Dockerfile` optimized for Cloud Run:

```bash
# Deploy to Cloud Run
gcloud run deploy mcp-http-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DEMO_MODE=true,ALLOWED_ORIGINS=https://yourdomain.com \
  --port 8080
```

**Local Docker Testing:**
```bash
# Build
docker build -t mcp-http-server .

# Run locally
docker run -p 8080:8080 --env-file .env mcp-http-server
```

Cloud Run will automatically use:
- `/healthz` for health checks
- `/healthz/ready` for readiness checks

### Environment Variables

Set these in Cloud Run or your deployment platform:

- `PORT=8080` (default: 8080)
- `DEMO_MODE=true` (for mocks) or `false` (for real APIs)
- `ALLOWED_ORIGINS=https://yourdomain.com` (comma-separated)
- `LOG_LEVEL=info` (optional, default: info)

## What to Demo in 90 Seconds

**For recruiters/interviewers:** Quick walkthrough script

1. **Setup (10s):** "Clone, run setup.sh, start server"
   ```bash
   git clone <repo-url>
   cd mcp-http-server
   ./setup.sh
   npm run dev
   ```

2. **Demo UI (30s):** Open `https://localhost:8443`
   - Click "Check Health" → Shows `demoMode: true`
   - Click "Call Ping" → Shows greeting message
   - Click "Search Products" → Shows mock Shopify results
   - Click "Create Checkout Session" → Shows mock Stripe session with idempotency key

3. **MCP Manifest (20s):** Open `https://localhost:8443/mcp-manifest.json`
   - Show tool definitions (ping, shopify.searchProducts, stripe.createCheckoutSession)
   - Explain how ChatGPT Apps can discover and use these tools

4. **Security Features (20s):** Show in browser DevTools
   - Correlation IDs in response headers
   - Security headers (X-Content-Type-Options, etc.)
   - Structured error responses with taxonomy

5. **Wrap-up (10s):** "Production-ready patterns: validation, logging, error handling, idempotency, health probes"

**Key talking points:**
- MCP tools for ChatGPT Apps integration
- Commerce checkout with idempotency
- Security-first architecture (headers, CORS, validation)
- Production-ready (health probes, structured logging, error taxonomy)
- Comprehensive enablement docs for partners

## License

MIT - See [LICENSE](LICENSE) file for details.
