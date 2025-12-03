import { createMcpHandler } from 'mcp-handler';
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

// Create MCP handler with all tools registered
// This handles JSON-RPC 2.0 protocol: initialize, tools/list, tools/call
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
  { capabilities: { tools: {} } }, // serverOptions with capabilities
  {
    basePath: '/mcp', // Match the route path
    disableSse: true, // Use Streamable HTTP only, no SSE
    verboseLogs: true, // Enable logging for debugging
  }
);

// Export handlers for Vercel (Web API style)
export async function GET(request: Request): Promise<Response> {
  return handler(request);
}

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handler(request);
}