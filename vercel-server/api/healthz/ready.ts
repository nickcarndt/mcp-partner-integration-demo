import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ReadyResponseSchema } from '../../lib/schemas.js';
import { handleOptionsRequest, setCorsHeaders } from '../../lib/cors.js';

export const config = {
  runtime: 'nodejs18.x',
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
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      return res.status(response.status).set(responseHeaders).end();
    }
    return res.status(403).end();
  }

  const headersObj: Record<string, string> = {};
  setCorsHeaders(new Headers(), origin).forEach((value, key) => {
    headersObj[key] = value;
  });

  const ready = {
    ok: true,
    ready: true as const,
  };
  const validated = ReadyResponseSchema.parse(ready);
  return res.status(200).set(headersObj).json(validated);
}

