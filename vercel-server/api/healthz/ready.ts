import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ReadyResponseSchema } from '../../lib/schemas.js';
import { handleOptionsRequest, setCorsHeaders } from '../../lib/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * Readiness probe endpoint
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || null;

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

  const ready = {
    ok: true,
    ready: true as const,
  };
  const validated = ReadyResponseSchema.parse(ready);
  return res.status(200).json(validated);
}

