import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuid } from 'uuid';

export const config = {
  runtime: 'nodejs22.x',
  maxDuration: 60,
};

/**
 * Get production URL from Vercel environment
 */
function getProductionUrl(): string {
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://localhost:3000';
}

/**
 * Get MCP manifest payload for SSE init event
 */
function getMCPManifestPayload() {
  const productionUrl = getProductionUrl();
  return {
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
}

/**
 * Send SSE message using raw Node.js APIs
 */
function sendSSEMessage(res: VercelResponse, event: string, data: any) {
  const eventId = uuid();
  const jsonData = JSON.stringify(data);
  res.write(`id: ${eventId}\n`);
  res.write(`event: ${event}\n`);
  res.write(`data: ${jsonData}\n\n`);
}

/**
 * MCP SSE endpoint - optimized for instant streaming
 * Uses raw Node.js APIs for maximum performance
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set SSE headers - CRITICAL for instant streaming
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.setHeader('Content-Encoding', 'identity'); // Required by ChatGPT MCP connector

  // Get correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || uuid();
  res.setHeader('X-Correlation-ID', correlationId);

  // Write headers and flush immediately
  res.writeHead(200);
  
  // Flush headers immediately - must happen before any data
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Send init event IMMEDIATELY (<50ms target)
  const manifest = getMCPManifestPayload();
  sendSSEMessage(res, 'mcp.init', manifest);

  // Force flush to ensure immediate transmission
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }

  // Keep connection alive with periodic ping (every 30s)
  const keepAliveInterval = setInterval(() => {
    try {
      sendSSEMessage(res, 'mcp.ping', { timestamp: new Date().toISOString() });
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch (err) {
      clearInterval(keepAliveInterval);
      try {
        res.end();
      } catch {
        // Connection already closed
      }
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    try {
      res.end();
    } catch {
      // Connection already closed
    }
  });

  // Handle errors
  req.on('error', () => {
    clearInterval(keepAliveInterval);
    try {
      res.end();
    } catch {
      // Connection already closed
    }
  });
}
