// @vercel/edge-no-buffer
console.log("SSE handler started", Date.now());
import type { VercelRequest, VercelResponse } from '@vercel/node';
console.log("Imports resolved");

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

/**
 * Lightweight UUID generator (no heavy imports)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

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
 * Pre-computed MCP manifest payload (computed at module load time)
 */
const MCP_MANIFEST_PAYLOAD = (() => {
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
})();

/**
 * Preload Shopify and Stripe clients outside handler
 * This ensures they're ready and don't delay the first SSE event
 */
let shopifyClientPreloaded = false;
let stripeClientPreloaded = false;

function preloadClients() {
  if (!shopifyClientPreloaded) {
    // Lazy import Shopify client - only load if needed
    try {
      // Just verify env vars exist, don't actually create client
      if (process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ACCESS_TOKEN) {
        shopifyClientPreloaded = true;
      }
    } catch {
      // Ignore errors during preload
    }
  }
  
  if (!stripeClientPreloaded) {
    // Lazy import Stripe client - only load if needed
    try {
      // Just verify env var exists, don't actually create client
      if (process.env.STRIPE_SECRET_KEY) {
        stripeClientPreloaded = true;
      }
    } catch {
      // Ignore errors during preload
    }
  }
}

// Preload clients at module initialization
preloadClients();

/**
 * Send SSE message using raw Node.js write
 */
function sendSSEMessage(res: VercelResponse, event: string, data: any): void {
  const eventId = generateId();
  const jsonData = JSON.stringify(data);
  res.write(`id: ${eventId}\n`);
  res.write(`event: ${event}\n`);
  res.write(`data: ${jsonData}\n\n`);
}

/**
 * MCP SSE endpoint - optimized for instant streaming
 * Sends mcp.init within 20ms, keeps connection alive with 30s pings
 */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  console.log("SSE handler invoked", Date.now(), "Method:", req.method, "URL:", req.url);
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    console.log("OPTIONS preflight request");
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set all required SSE headers explicitly
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Transfer-Encoding', 'identity');

  // Get correlation ID (use lightweight generator, no heavy imports)
  const correlationId = (req.headers['x-correlation-id'] as string) || generateId();
  res.setHeader('X-Correlation-ID', correlationId);

  // Write status and flush headers IMMEDIATELY
  const handlerStartTime = Date.now();
  console.log("Handler function called", handlerStartTime);
  
  res.writeHead(200);
  res.flushHeaders();
  const headersFlushedTime = Date.now();
  console.log("Headers flushed", headersFlushedTime, "Delay from handler start:", headersFlushedTime - handlerStartTime, "ms");

  // Send mcp.init event within 20ms using setTimeout
  // This ensures headers are flushed before any data
  const beforeInitTime = Date.now();
  console.log("Sending mcp.init", beforeInitTime, "Delay from handler start:", beforeInitTime - handlerStartTime, "ms");
  
  setTimeout(() => {
    const initSendTime = Date.now();
    console.log("Inside setTimeout, sending mcp.init now", initSendTime, "Delay from handler start:", initSendTime - handlerStartTime, "ms");
    sendSSEMessage(res, 'mcp.init', MCP_MANIFEST_PAYLOAD);
    
    // Force immediate flush of the init event
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
    const initFlushedTime = Date.now();
    console.log("mcp.init flushed", initFlushedTime, "Delay from handler start:", initFlushedTime - handlerStartTime, "ms");
  }, 0); // Use 0ms to send immediately after headers flush

  // Keep connection alive with 30-second ping
  const keepAliveInterval = setInterval(() => {
    try {
      console.log("Ping sent", new Date().toISOString());
      sendSSEMessage(res, 'mcp.ping', { timestamp: new Date().toISOString() });
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch (err) {
      console.log("Ping error", err);
      clearInterval(keepAliveInterval);
      try {
        res.end();
      } catch {
        // Connection already closed
      }
    }
  }, 30000); // 30 seconds

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
