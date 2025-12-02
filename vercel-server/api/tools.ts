import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ListToolsResponseSchema } from '../lib/schemas.js';
import { handleOptionsRequest, setCorsHeaders } from '../lib/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * List tools endpoint
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

  const payload = {
    tools: [
      {
        name: 'ping',
        description: 'Ping tool that returns a greeting',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name to greet' },
          },
        },
      },
      {
        name: 'shopify.searchProducts',
        description: 'Search products (mock)',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'stripe.createCheckoutSession',
        description: 'Create Stripe checkout session (legacy API)',
        inputSchema: {
          type: 'object',
          required: ['items', 'successUrl', 'cancelUrl'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  priceId: { type: 'string' },
                  quantity: { type: 'number' },
                },
              },
            },
            successUrl: { type: 'string' },
            cancelUrl: { type: 'string' },
          },
        },
      },
      {
        name: 'stripe_create_checkout_session',
        description: 'Create Stripe checkout session with product name and price',
        inputSchema: {
          type: 'object',
          required: ['productName', 'price'],
          properties: {
            productName: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string', default: 'usd' },
          },
        },
      },
      {
        name: 'stripe_get_payment_status',
        description: 'Get payment status for a payment intent',
        inputSchema: {
          type: 'object',
          required: ['paymentIntentId'],
          properties: {
            paymentIntentId: { type: 'string' },
          },
        },
      },
    ],
  };
  const validated = ListToolsResponseSchema.parse(payload);
  return res.status(200).json(validated);
}

