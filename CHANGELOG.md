# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-01-04

### Security

- **Strict CORS origin matching**: Replaced prefix-based checks with exact Set matching to prevent origin spoofing attacks (e.g., `localhost:8080.attacker` now correctly blocked)
- **CORS error handling**: Added `CORS_BLOCKED` error code (HTTP 403) for blocked origins

### Added

- **BAD_JSON error code**: Malformed JSON bodies now return 400 with `BAD_JSON` error code instead of generic 400
- **Zod output validation**: Added schema validation for `/mcp-manifest.json` and `/tools` endpoints to ensure contract compliance
- **CORS regression test**: Test verifies malicious origin `localhost:8080.attacker` is blocked
- **Invalid JSON test**: Test verifies malformed JSON returns proper error envelope with correlation ID

### Fixed

- Removed dead imports (`fileURLToPath`, `__filename`, `__dirname`) from server.ts
- Correlation ID middleware now runs before body parser to ensure IDs are available for error handling
- Vitest setup configured with Undici Agent for HTTPS test support

### Testing

- All tests route to HTTPS base URL (`https://localhost:8443`)
- Undici Agent configuration in `vitest.setup.ts` for self-signed certificate handling

## [0.1.0] - 2025-01-03

### Added

- Initial release of MCP HTTP Server
- RESTful API for MCP tools with Express.js
- Health check endpoint (`/healthz`) and ready probe (`/healthz/ready`)
- Type-safe implementation with TypeScript
- Input/output validation with Zod (defense-in-depth)
- Correlation ID tracking (request tracing via `X-Correlation-ID` header)
- Structured logging with Pino
- Error envelopes with taxonomy (BAD_PARAMS, UNKNOWN_TOOL, TIMEOUT, UPSTREAM_4XX, UPSTREAM_5XX, INTERNAL_ERROR, NOT_FOUND)
- Security headers via Helmet.js
- Strict CORS configuration with environment-based origin allowlist
- Request timeouts (10 seconds)
- Idempotency key support for checkout operations (`X-Idempotency-Key` header)
- Demo mode support (DEMO_MODE environment variable)
- HTTPS-first development server with self-signed certificates
- Interactive demo UI at `/` (https://localhost:8443)
- MCP manifest endpoint (`/mcp-manifest.json`) for tool discovery
- Three MCP tools:
  - `ping`: Connectivity test tool
  - `shopify.searchProducts`: Mock product search (demo mode)
  - `stripe.createCheckoutSession`: Mock Stripe checkout session (demo mode)
- Comprehensive test suite with Vitest (positive and negative test cases)
- HTTPS test routing with self-signed certificate support
- Setup script (`setup.sh`) for automated project initialization
- Dockerfile optimized for Cloud Run deployment
- Comprehensive documentation:
  - README with Solutions Architect role mapping
  - Troubleshooting guide with Safari quick checklist
  - Implementation guide for adding new tools
  - Multi-agent workflow documentation
  - FAQ and runbook for operations
  - Team commands and agent profiles for Cursor Pro
- LICENSE (MIT) and CODE_OF_CONDUCT.md

### Security

- Security headers (Helmet.js) - X-Content-Type-Options, X-Frame-Options, etc.
- Strict CORS with environment-based allowlist
- Input validation for all request parameters
- Output validation for all responses (defense-in-depth)
- Request timeouts to prevent resource exhaustion
- Correlation IDs for audit trails
- Idempotency keys to prevent duplicate operations

### Documentation

- Solutions Architect role mapping section
- Local HTTPS setup instructions (mkcert and OpenSSL)
- Cloud Run deployment instructions
- "What to demo in 90 seconds" script
- Safari compatibility troubleshooting
- Test coverage summary

### Testing

- Test suite with 13 test cases
- Positive tests for all tools
- Negative tests for BAD_PARAMS validation
- Tests for correlation ID and idempotency key support
- HTTPS test configuration with self-signed certificate handling

[0.1.0]: https://github.com/yourusername/mcp-http-server/releases/tag/v0.1.0

