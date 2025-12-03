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

// Build the MCP handler with all tools registered. SSE is disabled; transport is POST /mcp.
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'ping',
      'Ping tool that returns a greeting',
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
      'Search products in a Shopify store',
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
      'Create a Stripe checkout session with product name and price',
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
      'Get payment status for a Stripe payment intent',
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
  {
    basePath: '/mcp',
    disableSse: true,
    verboseLogs: true,
  }
);

// Vercel adapter to convert VercelRequest/VercelResponse to the Web API expected by mcp-handler.
export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`);

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
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
