import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEMO_MODE } from '../lib/utils.js';
import { HealthResponseSchema, ReadyResponseSchema } from '../lib/schemas.js';
import { handleOptionsRequest, setCorsHeaders } from '../lib/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * Health check endpoint
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || null;

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    const response = handleOptionsRequest(origin);
    if (response) {
      response.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });
      return res.status(response.status).end();
    }
    return res.status(403).end();
  }

  const headersObj: Record<string, string> = {};
  setCorsHeaders(new Headers(), origin).forEach((value: string, key: string) => {
    headersObj[key] = value;
  });

  // Set headers
  Object.entries(headersObj).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Check if this is a readiness probe
  if (req.url?.includes('/ready')) {
    const ready = {
      ok: true,
      ready: true as const,
    };
    const validated = ReadyResponseSchema.parse(ready);
    return res.status(200).json(validated);
  }

  // Regular health check
  const health = {
    ok: true,
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    demoMode: DEMO_MODE,
  };
  const validated = HealthResponseSchema.parse(health);
  return res.status(200).json(validated);
}

