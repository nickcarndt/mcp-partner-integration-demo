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

// Create the MCP handler
// Disable SSE since Redis is not configured and SSE requires Redis/KV
const mcpHandler = createMcpHandler(
  (server) => {
  // Ping tool - simple greeting
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

  // Shopify product search tool
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

  // Stripe checkout session creation (simple version)
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

  // Stripe checkout session creation (legacy version with price IDs)
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

  // Stripe payment status check
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
  undefined, // serverOptions
  { disableSse: true } // config - disable SSE since Redis is not configured
);

// Vercel handler wrapper to convert VercelRequest/VercelResponse to Web API format
async function handler(req: VercelRequest, res: VercelResponse) {
  // Convert Vercel request to Web API Request
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`);
  
  // Get request body
  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  }

  const webRequest = new Request(url, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    body,
  });

  // Call the MCP handler
  const webResponse = await mcpHandler(webRequest);

  // Convert Web API Response to Vercel response
  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const responseBody = await webResponse.text();
  return res.send(responseBody);
}

export default handler;
export { handler as GET, handler as POST };

