# Test Coverage Summary

## Test Setup

✅ **HTTPS Test Configuration:**
- Tests route to `https://localhost:8443` by default (can use `ENABLE_HTTPS=false` for HTTP)
- `NODE_TLS_REJECT_UNAUTHORIZED=0` set in `package.json` test script for self-signed certs
- `vitest.setup.ts` provides place for future Undici agent configuration if needed
- Tests verify server is running before execution (clear error if not)

## Negative Test Coverage (BAD_PARAMS)

### ✅ shopify.searchProducts
- **Test:** Missing required `query` parameter
- **Expected:** 400 status, `BAD_PARAMS` error code

### ✅ stripe.createCheckoutSession  
- **Test 1:** Missing required fields (empty params)
- **Test 2:** Invalid URL format for `successUrl`
- **Test 3:** Invalid items (negative quantity)
- **Expected:** 400 status, `BAD_PARAMS` error code for all

### ℹ️ ping
- **Note:** No BAD_PARAMS test - tool accepts optional `name` parameter with no strict validation
- All parameters are optional, so no validation failures possible

## All Tools Coverage

✅ **Positive Tests:**
- `healthz` - Health check endpoint
- `ping` - Connectivity test
- `shopify.searchProducts` - Product search
- `stripe.createCheckoutSession` - Checkout session creation

✅ **Negative Tests:**
- `shopify.searchProducts` - BAD_PARAMS (missing query)
- `stripe.createCheckoutSession` - BAD_PARAMS (3 scenarios)
- `unknownTool` - UNKNOWN_TOOL (404)
- `invalid JSON` - 400 error handling

✅ **Feature Tests:**
- Correlation ID echo in response headers
- Idempotency key support for checkout
- Ready probe endpoint

## Running Tests

**Prerequisites:** Server must be running
```bash
# Terminal 1: Start server
DEMO_MODE=true npm run dev

# Terminal 2: Run tests
npm test
```

**Test Configuration:**
- Base URL: `https://localhost:8443` (HTTPS) or `http://localhost:8080` (HTTP)
- Timeout: 10 seconds per test
- Server check: 5 attempts, 1 second intervals

