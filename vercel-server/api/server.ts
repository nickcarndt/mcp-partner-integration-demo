import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { searchProducts } from '../lib/tools/shopify.js';
import {
  createCheckoutSession,
  createCheckoutSessionLegacy,
  getPaymentStatus,
} from '../lib/tools/stripe.js';
import { handleOptionsRequest, setCorsHeaders } from '../lib/cors.js';

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      'ping',
      'A simple ping tool',
      { name: z.string().optional() },
      async ({ name }) => ({
        content: [{ type: 'text', text: `Hello, ${name ?? 'World'}!` }],
      })
    );

    server.tool(
      'shopify_search_products',
      'Search for products in a Shopify store by query string',
      {
        query: z.string(),
        limit: z.number().int().positive().optional().default(10),
      },
      async (args) => {
        const result = await searchProducts(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_create_checkout_session',
      'Create a Stripe checkout session with a product name and price',
      {
        productName: z.string(),
        price: z.number().positive(),
        currency: z.string().optional().default('usd'),
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      },
      async (args) => {
        const result = await createCheckoutSession(
          args.productName,
          args.price,
          args.currency || 'usd',
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
      {
        items: z.array(
          z.object({
            priceId: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      },
      async (args) => {
        const result = await createCheckoutSessionLegacy(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      'stripe_get_payment_status',
      'Get the payment status for a Stripe payment intent',
      {
        paymentIntentId: z.string(),
      },
      async (args) => {
        const result = await getPaymentStatus(args.paymentIntentId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }
    );
  },
  {},  // second arg: serverOptions (empty)
  {    // third arg: handlerConfig
    redisUrl: process.env.REDIS_URL,
  }
);

function addCacheHeaders(headers: Headers): Headers {
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  return headers;
}

function logRequest(method: string, path: string, status: number): void {
  console.log(`[MCP] ${method} ${path} ${status}`);
}

async function wrapHandler(
  request: Request,
  handler: (request: Request) => Promise<Response>,
  method: string
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  try {
    const response = await handler(request);
    const status = response.status;
    logRequest(method, path, status);
    
    // Add cache headers to response
    const newHeaders = new Headers(response.headers);
    addCacheHeaders(newHeaders);
    
    return new Response(response.body, {
      status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error: any) {
    const status = 500;
    logRequest(method, path, status);
    
    // Only catch Redis connectivity/session errors when REDIS_URL is configured
    // Be very conservative - only catch errors that are clearly Redis-related
    if (process.env.REDIS_URL) {
      const errorMessage = (error?.message || String(error)).toLowerCase();
      const errorCode = error?.code;
      
      // Only catch errors that explicitly indicate Redis connection/session failures
      // Require both "redis" in message AND connection-related indicators to avoid false positives
      const isRedisConnectionError =
        (errorMessage.includes('redis') &&
          (errorMessage.includes('connect') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('enotfound') ||
            errorCode === 'ECONNREFUSED' ||
            errorCode === 'ENOTFOUND')) ||
        errorMessage.includes('redis client') ||
        errorMessage.includes('redis connection');
      
      if (isRedisConnectionError) {
        const origin = request.headers.get('origin');
        const headers = setCorsHeaders(
          new Headers({ 'Content-Type': 'application/json' }),
          origin
        );
        addCacheHeaders(headers);
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Redis unavailable. Check /api/healthz/ready for details.',
            },
            id: null,
          }),
          { status: 503, headers }
        );
      }
    }
    // Re-throw all other errors to surface real bugs (will return 500)
    throw error;
  }
}

export async function GET(request: Request): Promise<Response> {
  // Handle GET requests for discovery probes with helpful JSON response
  const origin = request.headers.get('origin');
  const headers = setCorsHeaders(
    new Headers({ 'Content-Type': 'application/json' }),
    origin
  );
  addCacheHeaders(headers);
  
  logRequest('GET', new URL(request.url).pathname, 200);
  
  return new Response(
    JSON.stringify({
      ok: true,
      protocol: 'MCP',
      usage: 'Use POST with JSON-RPC 2.0 format. See /api/healthz for status.',
      endpoints: {
        health: '/api/healthz',
        ready: '/api/healthz/ready',
      },
    }),
    { status: 200, headers }
  );
}

export async function POST(request: Request): Promise<Response> {
  return wrapHandler(request, baseHandler, 'POST');
}

export async function DELETE(request: Request): Promise<Response> {
  return wrapHandler(request, baseHandler, 'DELETE');
}
