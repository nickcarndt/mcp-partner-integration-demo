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

// Create MCP handler for Streamable HTTP transport
// This handles JSON-RPC 2.0 protocol: initialize, tools/list, tools/call
console.log('[MCP] Streamable HTTP handler initialized');
console.log('[MCP] REDIS_URL configured:', !!process.env.REDIS_URL);
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
    redisUrl: process.env.REDIS_URL,
    verboseLogs: true,
  }
);

// Export handlers for Vercel (Web API style)
export async function GET(request: Request): Promise<Response> {
  console.log('[MCP] GET request (Streamable HTTP):', request.url);
  console.log('[MCP] GET Accept header:', request.headers.get('accept'));
  return handler(request);
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.clone().text();
  console.log('[MCP] POST request (Streamable HTTP):', request.url);
  console.log('[MCP] POST headers:', Object.fromEntries(request.headers.entries()));
  console.log('[MCP] POST body:', body);
  return handler(request);
}

export async function DELETE(request: Request): Promise<Response> {
  console.log('[MCP] DELETE request (Streamable HTTP):', request.url);
  return handler(request);
}

// Add OPTIONS for CORS preflight
export async function OPTIONS(request: Request): Promise<Response> {
  console.log('[MCP] OPTIONS request (CORS preflight):', request.url);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

// Add catch-all for any other methods
export async function PUT(request: Request): Promise<Response> {
  console.log('[MCP] PUT request (unexpected):', request.url);
  return new Response('Method not allowed', { status: 405 });
}

export async function PATCH(request: Request): Promise<Response> {
  console.log('[MCP] PATCH request (unexpected):', request.url);
  return new Response('Method not allowed', { status: 405 });
}

