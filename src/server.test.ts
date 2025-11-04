import { describe, it, expect, beforeAll } from 'vitest';

// Route tests to HTTPS base URL (default for local development)
// Use ENABLE_HTTPS=false to test HTTP mode
const USE_HTTPS = (process.env.ENABLE_HTTPS ?? 'true') !== 'false';
const BASE_URL = USE_HTTPS ? 'https://localhost:8443' : 'http://localhost:8080';

// For HTTPS tests with self-signed certs, Node.js fetch requires
// NODE_TLS_REJECT_UNAUTHORIZED=0 to be set (handled by test script or CI)
// In browser environments, this is handled by user trusting the cert

// Verify server is running before tests
beforeAll(async () => {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`${BASE_URL}/healthz`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        return;
      }
    } catch (err: any) {
      // Server not ready yet or connection error
      if (err.name === 'AbortError') {
        // Timeout - continue to next attempt
      }
    }
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(
    `Server not running at ${BASE_URL}. Please start the server with: DEMO_MODE=true npm run dev`
  );
}, 10000);

describe('health & ping', () => {
  it('healthz ok', async () => {
    const r = await fetch(`${BASE_URL}/healthz`);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect(j.status).toBe('ok');
  });

  it('ping ok', async () => {
    const r = await fetch(`${BASE_URL}/tools/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: { name: 'Nick' } }),
    });
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect(j.message).toContain('Nick');
  });

  it('shopify.searchProducts ok', async () => {
    const r = await fetch(`${BASE_URL}/tools/shopify.searchProducts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: { query: 'laptop', limit: 5 } }),
    });
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect(j.products).toBeDefined();
    expect(Array.isArray(j.products)).toBe(true);
  });

  it('stripe.createCheckoutSession ok', async () => {
    const r = await fetch(`${BASE_URL}/tools/stripe.createCheckoutSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: {
          items: [{ priceId: 'price_123', quantity: 1 }],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      }),
    });
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect(j.sessionId).toBeDefined();
    expect(j.url).toBeDefined();
  });
});

describe('negative cases', () => {
  it('shopify.searchProducts bad params returns 400 with BAD_PARAMS', async () => {
    const r = await fetch(`${BASE_URL}/tools/shopify.searchProducts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: {} }), // Missing required 'query'
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('BAD_PARAMS');
    expect(j.error.correlationId).toBeDefined();
  });

  it('stripe.createCheckoutSession bad params returns 400 with BAD_PARAMS', async () => {
    const r = await fetch(`${BASE_URL}/tools/stripe.createCheckoutSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: {} }), // Missing required fields
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('BAD_PARAMS');
    expect(j.error.correlationId).toBeDefined();
  });

  it('stripe.createCheckoutSession invalid URL returns 400 with BAD_PARAMS', async () => {
    const r = await fetch(`${BASE_URL}/tools/stripe.createCheckoutSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: {
          items: [{ priceId: 'price_123', quantity: 1 }],
          successUrl: 'not-a-url', // Invalid URL
          cancelUrl: 'https://example.com/cancel',
        },
      }),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('BAD_PARAMS');
  });

  it('stripe.createCheckoutSession invalid items returns 400 with BAD_PARAMS', async () => {
    const r = await fetch(`${BASE_URL}/tools/stripe.createCheckoutSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: {
          items: [{ priceId: 'price_123', quantity: -1 }], // Negative quantity
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      }),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('BAD_PARAMS');
  });

  it('unknown tool returns 404 with UNKNOWN_TOOL', async () => {
    const r = await fetch(`${BASE_URL}/tools/unknownTool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: {} }),
    });
    expect(r.status).toBe(404);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('UNKNOWN_TOOL');
    expect(j.error.message).toContain('unknownTool');
    expect(j.error.correlationId).toBeDefined();
  });

  it('correlation ID is echoed in response header', async () => {
    const correlationId = 'test-corr-123';
    const r = await fetch(`${BASE_URL}/tools/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({ params: { name: 'Test' } }),
    });
    expect(r.headers.get('x-correlation-id')).toBe(correlationId);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
  });

  it('idempotency key is supported for checkout', async () => {
    const idempotencyKey = 'test-idempotency-123';
    const r = await fetch(`${BASE_URL}/tools/stripe.createCheckoutSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        params: {
          items: [{ priceId: 'price_123', quantity: 1 }],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      }),
    });
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect(j.idempotencyKey).toBe(idempotencyKey);
    expect(j.sessionId).toContain(idempotencyKey);
  });

  it('ready probe returns ok', async () => {
    const r = await fetch(`${BASE_URL}/healthz/ready`);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect(j.ready).toBe(true);
  });

  it('invalid JSON returns 400 with BAD_JSON', async () => {
    const r = await fetch(`${BASE_URL}/tools/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('BAD_JSON');
    expect(j.error.message).toBe('Malformed JSON body');
    expect(j.error.correlationId).toBeDefined();
    expect(r.headers.get('x-correlation-id')).toBeDefined();
  });

  it('CORS blocked origin returns 403 with CORS_BLOCKED', async () => {
    const r = await fetch(`${BASE_URL}/tools/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8080.attacker',
      },
      body: JSON.stringify({ params: { name: 'Test' } }),
    });
    expect(r.status).toBe(403);
    const j = (await r.json()) as any;
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe('CORS_BLOCKED');
    expect(j.error.message).toBe('Origin not allowed');
    expect(j.error.correlationId).toBeDefined();
  });
});
