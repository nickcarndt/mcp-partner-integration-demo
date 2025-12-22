import { handleOptionsRequest, setCorsHeaders } from '../lib/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const response = handleOptionsRequest(origin);
  return response ?? new Response(null, { status: 403 });
}

export async function GET(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const headers = setCorsHeaders(
    new Headers({ 'Content-Type': 'application/json' }),
    origin
  );

  const info = {
    name: 'MCP HTTP Server',
    version: '0.1.1',
    description: 'Model Context Protocol server with Shopify and Stripe integrations',
    endpoints: {
      health: '/api/healthz',
      ready: '/api/healthz/ready',
      mcp: '/mcp',
    },
    tools: [
      'ping',
      'shopify_search_products',
      'stripe_create_checkout_session',
      'stripe_create_checkout_session_legacy',
      'stripe_get_payment_status',
    ],
  };

  return new Response(JSON.stringify(info, null, 2), {
    status: 200,
    headers,
  });
}
