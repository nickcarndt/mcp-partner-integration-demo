import { buildAllowedOriginsSet, isOriginAllowed } from './utils.js';

const ALLOWED_ORIGINS_SET = buildAllowedOriginsSet();

/**
 * Set CORS headers on response
 */
export function setCorsHeaders(headers: Headers, origin: string | null): Headers {
  if (isOriginAllowed(origin, ALLOWED_ORIGINS_SET)) {
    headers.set('Access-Control-Allow-Origin', origin || '*');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID, X-Idempotency-Key, X-SSE-Connection-ID');
    headers.set('Access-Control-Expose-Headers', 'X-Correlation-ID');
  }
  return headers;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleOptionsRequest(origin: string | null): Response | null {
  if (isOriginAllowed(origin, ALLOWED_ORIGINS_SET)) {
    const headers = new Headers();
    setCorsHeaders(headers, origin);
    return new Response(null, { status: 204, headers });
  }
  return new Response(JSON.stringify({ error: 'CORS_NOT_ALLOWED' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

