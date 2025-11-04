# Hardening Summary

All production-ready hardening features have been implemented.

## ✅ Completed Features

### 1. Error Envelope & Output Validation
- ✅ Error helper function: `err(code, message, details?, correlationId?)`
- ✅ All responses validated with Zod output schemas (defense-in-depth)
- ✅ Standardized error format: `{ok: false, error: {code, message, details, correlationId}}`

### 2. Correlation IDs + Structured Logging
- ✅ UUID v4 correlation IDs (auto-generated if not provided)
- ✅ Correlation ID echoed in response header (`x-correlation-id`)
- ✅ Pino structured logging with correlation IDs bound to all log entries
- ✅ Configurable log levels via `LOG_LEVEL` env var

### 3. Security Headers + Strict CORS
- ✅ Helmet for security headers
- ✅ Strict CORS with origin allowlist (`ALLOWED_ORIGINS`)
- ✅ Default: `http://localhost:3000` (configurable)

### 4. Request Timeouts + Upstream Backoff
- ✅ Global 10-second timeout for all requests
- ✅ Error taxonomy: `TIMEOUT`, `UPSTREAM_4XX`, `UPSTREAM_5XX`
- ✅ Proper error handling for upstream service failures

### 5. Ready Probe
- ✅ `/healthz/ready` endpoint for Cloud Run / Kubernetes
- ✅ Returns `{ok: true, ready: true}`
- ✅ Ready for Redis/DB checks when added

### 6. Manifest Cache Headers + Version Bump
- ✅ `Cache-Control: no-store` on `/mcp-manifest.json`
- ✅ Version bumped to `0.1.1`

### 7. Idempotency for Checkout
- ✅ Accepts `x-idempotency-key` header
- ✅ Idempotency key reflected in response
- ✅ Same key returns same result (even in demo mode)

### 8. Negative Test Cases
- ✅ Bad params → 400 with `BAD_PARAMS`
- ✅ Unknown tool → 404 with `UNKNOWN_TOOL`
- ✅ Correlation ID echo test
- ✅ Idempotency key test
- ✅ Ready probe test
- ✅ Invalid JSON test

## Error Taxonomy

| Code | Status | Description |
|------|--------|-------------|
| `BAD_PARAMS` | 400 | Invalid request parameters |
| `UNKNOWN_TOOL` | 404 | Tool not found |
| `NOT_FOUND` | 404 | Path not found |
| `TIMEOUT` | 500 | Request timeout |
| `UPSTREAM_4XX` | 502 | Upstream service 4xx error |
| `UPSTREAM_5XX` | 502 | Upstream service 5xx error |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Dependencies Added

- `cors`: CORS middleware
- `helmet`: Security headers
- `pino`: Structured logging
- `pino-http`: HTTP request logging
- `uuid`: Correlation ID generation

## Environment Variables

```bash
PORT=8080
DEMO_MODE=true
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=info
```

## Verification Commands

```bash
# Health check
curl -is http://localhost:8080/healthz

# Correlation ID echo
curl -is http://localhost:8080/tools/ping \
  -H 'Content-Type: application/json' \
  -H 'x-correlation-id: demo-123' \
  -d '{"params":{"name":"Nick"}}' | sed -n '1,10p'

# Bad params
curl -s -X POST http://localhost:8080/tools/shopify.searchProducts \
  -H 'Content-Type: application/json' \
  -d '{"params":{}}' | jq

# Ready probe
curl -s http://localhost:8080/healthz/ready | jq
```

## Next Steps (Future)

- Wire real Storefront GraphQL + Stripe sessions behind `DEMO_MODE=false`
- Add Redis caching for product search
- Add Neon database for audit logging
- Extend `/healthz/ready` to check Redis/DB connectivity
- Add rate limiting
- Add request/response compression

