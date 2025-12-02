import { createMcpHandler } from 'mcp-handler';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEMO_MODE } from '../lib/utils.js';
import { PingParamsSchema } from '../lib/schemas.js';
import { searchProducts, SearchProductsParamsSchema } from '../lib/tools/shopify.js';
import {
  createCheckoutSession,
  createCheckoutSessionLegacy,
  getPaymentStatus,
  SimpleCheckoutSessionParamsSchema,
  CreateCheckoutSessionParamsSchema,
  GetPaymentStatusParamsSchema,
} from '../lib/tools/stripe.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
};

function buildManifest() {
  return {
    manifest: {
      name: 'partner-integration-demo',
      version: '0.1.1',
      description: 'Production MCP tools for partner integrations (Shopify + Stripe)',
      tools: [
        {
          name: 'ping',
          description: 'A simple ping tool that returns a greeting message',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name to greet' },
            },
          },
        },
        {
          name: 'shopify_search_products',
          description: 'Search for products in a Shopify store by query string',
          inputSchema: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string', description: 'Search query (title/vendor/type)' },
              limit: { type: 'number', default: 10, description: 'Maximum number of products to return' },
            },
          },
        },
        {
          name: 'stripe_create_checkout_session',
          description: 'Create a Stripe checkout session with a product name and price',
          inputSchema: {
            type: 'object',
            required: ['productName', 'price'],
            properties: {
              productName: { type: 'string', description: 'Name of the product being purchased' },
              price: { type: 'number', description: 'Price in cents (e.g., 4999 for $49.99)' },
              currency: { type: 'string', default: 'usd', description: 'Currency code (ISO 4217)' },
              successUrl: { type: 'string', description: 'Optional success URL override' },
              cancelUrl: { type: 'string', description: 'Optional cancel URL override' },
            },
          },
        },
        {
          name: 'stripe_create_checkout_session_legacy',
          description: 'Create a Stripe checkout session using price IDs (legacy API)',
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
          name: 'stripe_get_payment_status',
          description: 'Get the payment status for a Stripe payment intent',
          inputSchema: {
            type: 'object',
            required: ['paymentIntentId'],
            properties: {
              paymentIntentId: { type: 'string', description: 'Stripe payment intent ID' },
            },
          },
        },
      ],
    },
  };
}

// Create the MCP handler with SSE disabled (no Redis/KV configured)
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'ping',
      'A simple ping tool that returns a greeting message',
      PingParamsSchema.shape,
      async (args) => {
        const name = args.name || 'World';
        const result = {
          ok: true,
          message: `Hello, ${name}!`,
          timestamp: new Date().toISOString(),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'shopify_search_products',
      'Search for products in a Shopify store by query string',
      SearchProductsParamsSchema.shape,
      async (args) => {
        const result = await searchProducts(args, DEMO_MODE);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_create_checkout_session',
      'Create a Stripe checkout session with a product name and price',
      SimpleCheckoutSessionParamsSchema.shape,
      async (args) => {
        const result = await createCheckoutSession(
          args.productName,
          args.price,
          args.currency || 'usd',
          DEMO_MODE,
          args.successUrl,
          args.cancelUrl
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_create_checkout_session_legacy',
      'Create a Stripe checkout session using price IDs (legacy API)',
      CreateCheckoutSessionParamsSchema.shape,
      async (args) => {
        const result = await createCheckoutSessionLegacy(args, DEMO_MODE);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_get_payment_status',
      'Get the payment status for a Stripe payment intent',
      GetPaymentStatusParamsSchema.shape,
      async (args) => {
        const result = await getPaymentStatus(args.paymentIntentId, DEMO_MODE);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );
  },
  undefined,
  { disableSse: true }
);

// Vercel handler wrapper to convert VercelRequest/VercelResponse to Web API format
export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`);

  // Build request body and normalize legacy "manifest" method name to "get_manifest"
  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    try {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.method === 'manifest' || parsed.method === 'get_manifest')) {
        const manifest = buildManifest();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: parsed.id ?? null,
            result: manifest,
          })
        );
      }
      body = JSON.stringify(parsed);
    } catch {
      body = raw;
    }
  }

  const webRequest = new Request(url, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    body,
  });

  const webResponse = await handler(webRequest);

  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const responseBody = await webResponse.text();
  return res.send(responseBody);
}
