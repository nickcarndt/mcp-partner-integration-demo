import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuid } from 'uuid';
import { PingParamsSchema, PingResultSchema } from '../lib/schemas.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * Ping tool handler
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  const correlationId = req.headers['x-correlation-id'] as string || uuid();
  res.setHeader('X-Correlation-ID', correlationId);

  try {
    const params = PingParamsSchema.parse(req.body?.params || {});
    const name = params.name || 'World';
    const payload = {
      ok: true as const,
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    };
    const validated = PingResultSchema.parse(payload);
    return res.status(200).json(validated);
  } catch (errInstance: any) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_PARAMS',
        message: 'Invalid parameters',
        correlationId,
      },
    });
  }
}

