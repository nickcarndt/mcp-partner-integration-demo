import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { DEMO_MODE } from '../lib/utils.js';
import { ShopifyResultSchema } from '../lib/schemas.js';
import { searchProducts, SearchProductsParamsSchema } from '../lib/tools/shopify.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * Shopify tool handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID, X-Idempotency-Key');
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
    const params = SearchProductsParamsSchema.parse(req.body?.params || {});
    const result = await searchProducts(params, DEMO_MODE);
    const validated = ShopifyResultSchema.parse(result);
    return res.status(200).json(validated);
  } catch (errInstance: any) {
    console.error({ err: errInstance, correlationId }, 'Shopify tool error');

    if (errInstance instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'BAD_PARAMS',
          message: 'Invalid parameters',
          details: errInstance.errors.map((e) => e.message),
          correlationId,
        },
      });
    }

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errInstance.message || 'Internal server error',
        correlationId,
      },
    });
  }
}

