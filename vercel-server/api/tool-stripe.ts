import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { DEMO_MODE } from '../lib/utils.js';
import {
  StripeResultSchema,
  SimpleCheckoutResultSchema,
  PaymentStatusResultSchema,
} from '../lib/schemas.js';
import {
  createCheckoutSession,
  createCheckoutSessionLegacy,
  getPaymentStatus,
  CreateCheckoutSessionParamsSchema,
  SimpleCheckoutSessionParamsSchema,
  GetPaymentStatusParamsSchema,
} from '../lib/tools/stripe.js';

export const config = {
  runtime: 'nodejs22.x',
};

/**
 * Stripe tool handler
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
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  res.setHeader('X-Correlation-ID', correlationId);

  // Get tool name from query or body
  const toolName = (req.query.toolName as string) || req.body?.toolName;

  try {
    switch (toolName) {
      case 'createCheckoutSession':
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
        return res.status(404).json({
          ok: false,
          error: {
            code: 'UNKNOWN_TOOL',
            message: `Tool not found: ${toolName}`,
            correlationId,
          },
        });
    }
  } catch (errInstance: any) {
    console.error({ err: errInstance, correlationId, toolName }, 'Stripe tool error');

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

    // Handle upstream errors
    if (errInstance.statusCode >= 400 && errInstance.statusCode < 500) {
      return res.status(502).json({
        ok: false,
        error: {
          code: 'UPSTREAM_4XX',
          message: `Upstream error: ${errInstance.message}`,
          correlationId,
        },
      });
    }

    if (errInstance.statusCode >= 500) {
      return res.status(502).json({
        ok: false,
        error: {
          code: 'UPSTREAM_5XX',
          message: `Upstream error: ${errInstance.message}`,
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

