import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { DEMO_MODE, getCorrelationId, err } from '../../lib/utils.js';
import {
  PingParamsSchema,
  PingResultSchema,
  ShopifyResultSchema,
  StripeResultSchema,
  SimpleCheckoutResultSchema,
  PaymentStatusResultSchema,
} from '../../lib/schemas.js';
import { searchProducts, SearchProductsParamsSchema } from '../../lib/tools/shopify.js';
import {
  createCheckoutSession,
  createCheckoutSessionLegacy,
  getPaymentStatus,
  CreateCheckoutSessionParamsSchema,
  SimpleCheckoutSessionParamsSchema,
  GetPaymentStatusParamsSchema,
} from '../../lib/tools/stripe.js';
import { handleOptionsRequest, setCorsHeaders } from '../../lib/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * Tool execution endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const headersObj: Record<string, string> = {};
  setCorsHeaders(new Headers(), origin).forEach((value: string, key: string) => {
    headersObj[key] = value;
  });

  // Set headers
  Object.entries(headersObj).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const correlationId = getCorrelationId(req.headers);
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  const toolName = req.query.toolName as string;

  // Set correlation ID header
  headersObj['X-Correlation-ID'] = correlationId;

  try {
    switch (toolName) {
      case 'ping': {
        const params = PingParamsSchema.parse(req.body?.params || {});
        const name = params.name || 'World';
        const payload = {
          ok: true as const,
          message: `Hello, ${name}!`,
          timestamp: new Date().toISOString(),
        };
        const validated = PingResultSchema.parse(payload);
        return res.status(200).json(validated);
      }

      case 'shopify.searchProducts': {
        const params = SearchProductsParamsSchema.parse(req.body?.params || {});
        const result = await searchProducts(params, DEMO_MODE);
        const validated = ShopifyResultSchema.parse(result);
        return res.status(200).json(validated);
      }

      case 'stripe.createCheckoutSession': {
        const params = CreateCheckoutSessionParamsSchema.parse(req.body?.params || {});
        const result = await createCheckoutSessionLegacy(params, DEMO_MODE, idempotencyKey);
        const validated = StripeResultSchema.parse(result);
        return res.status(200).json(validated);
      }

      case 'stripe_create_checkout_session': {
        const params = SimpleCheckoutSessionParamsSchema.parse(req.body?.params || {});
        const result = await createCheckoutSession(
          params.productName,
          params.price,
          params.currency,
          DEMO_MODE,
          params.successUrl,
          params.cancelUrl
        );
        const validated = SimpleCheckoutResultSchema.parse(result);
        return res.status(200).json(validated);
      }

      case 'stripe_get_payment_status': {
        const params = GetPaymentStatusParamsSchema.parse(req.body?.params || {});
        const result = await getPaymentStatus(params.paymentIntentId, DEMO_MODE);
        const validated = PaymentStatusResultSchema.parse(result);
        return res.status(200).json(validated);
      }

      default:
        return res.status(404).json(err('UNKNOWN_TOOL', `Tool not found: ${toolName}`, undefined, correlationId));
    }
  } catch (errInstance: any) {
    console.error({ err: errInstance, correlationId, toolName }, 'Tool execution error');

    if (errInstance instanceof z.ZodError) {
      const errorPayload = {
        code: 'BAD_PARAMS',
        message: 'Invalid parameters',
        details: errInstance.errors.map((e) => e.message),
        status: 400,
      };
      return res.status(400).json({
        ok: false,
        error: {
          ...errorPayload,
          correlationId,
        },
      });
    }

    // Handle timeout errors
    if (errInstance.code === 'ECONNABORTED' || errInstance.message?.includes('timeout')) {
      const errorPayload = {
        code: 'TIMEOUT',
        message: 'Request timeout',
        status: 500,
      };
      return res.status(500).json({
        ok: false,
        error: {
          ...errorPayload,
          correlationId,
        },
      });
    }

    // Handle upstream errors
    if (errInstance.statusCode >= 400 && errInstance.statusCode < 500) {
      const errorPayload = {
        code: 'UPSTREAM_4XX',
        message: `Upstream error: ${errInstance.message}`,
        status: 502,
      };
      return res.status(502).json({
        ok: false,
        error: {
          ...errorPayload,
          correlationId,
        },
      });
    }

    if (errInstance.statusCode >= 500) {
      const errorPayload = {
        code: 'UPSTREAM_5XX',
        message: `Upstream error: ${errInstance.message}`,
        status: 502,
      };
      return res.status(502).json({
        ok: false,
        error: {
          ...errorPayload,
          correlationId,
        },
      });
    }

    const errorPayload = {
      code: 'INTERNAL_ERROR',
      message: errInstance.message || 'Internal server error',
      status: 500,
    };
    return res.status(500).json({
      ok: false,
      error: {
        ...errorPayload,
        correlationId,
      },
    });
  }
}

