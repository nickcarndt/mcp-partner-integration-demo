import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MCPManifestSchema } from '../lib/schemas';

export const config = {
  runtime: 'nodejs22.x',
};

/**
 * Get production URL from Vercel environment
 */
function getProductionUrl(): string {
  // Use MCP_SERVER_URL if explicitly set
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL;
  }

  // Use VERCEL_URL (available in all Vercel deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback for local development
  return 'https://localhost:3000';
}

/**
 * MCP Manifest endpoint
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  // Set CORS headers
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Cache-Control', 'no-store');

  const productionUrl = getProductionUrl();
  const payload = {
    name: 'partner-integration-demo',
    version: '0.1.1',
    description: 'Production MCP tools for partner integrations (Shopify + Stripe)',
    homepage: productionUrl,
    tools: [
      {
        name: 'ping',
        description: 'Connectivity test',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
      {
        name: 'shopify.searchProducts',
        description: 'Search products in Shopify store',
        parameters: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Search query (searches in product title, vendor, and type)' },
            limit: { type: 'number', default: 10, description: 'Maximum number of products to return' },
          },
        },
      },
      {
        name: 'stripe.createCheckoutSession',
        description: 'Create Stripe Checkout Session (legacy API)',
        parameters: {
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
        description: 'Create Stripe checkout session with product name and price. Returns a checkout URL that redirects to Stripe payment page.',
        parameters: {
          type: 'object',
          required: ['productName', 'price'],
          properties: {
            productName: { type: 'string', description: 'Name of the product being purchased' },
            price: { type: 'number', description: 'Price in cents (e.g., 4999 for $49.99)' },
            currency: { type: 'string', default: 'usd', description: 'Currency code (ISO 4217)' },
          },
        },
      },
      {
        name: 'stripe_get_payment_status',
        description: 'Get payment status for a payment intent. Returns status, amount, and currency.',
        parameters: {
          type: 'object',
          required: ['paymentIntentId'],
          properties: {
            paymentIntentId: { type: 'string', description: 'Stripe payment intent ID' },
          },
        },
      },
    ],
  };

  const validated = MCPManifestSchema.parse(payload);
  return res.status(200).json(validated);
}
