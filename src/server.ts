import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { v4 as uuid } from 'uuid';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';
import { searchProducts, SearchProductsParamsSchema } from './tools/shopify.js';
import {
  createCheckoutSession,
  createCheckoutSessionLegacy,
  getPaymentStatus,
  CreateCheckoutSessionParamsSchema,
  SimpleCheckoutSessionParamsSchema,
  GetPaymentStatusParamsSchema,
} from './tools/stripe.js';

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.PORT || 8080);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 8443);
const ENABLE_DEV_HTTPS = (process.env.ENABLE_HTTPS ?? 'true') !== 'false';

const pickPath = (...candidates: (string | undefined)[]) => {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates.find((candidate): candidate is string => Boolean(candidate));
};

const TLS_CERT_PATH =
  pickPath(
    process.env.TLS_CERT,
    process.env.TLS_CERT_PATH,
    path.join(process.cwd(), 'cert', 'localhost.pem'),
    path.join(process.cwd(), 'cert', 'localhost-cert.pem'),
    path.join(process.cwd(), 'certs', 'localhost.pem'),
    path.join(process.cwd(), 'certs', 'localhost-cert.pem')
  ) || path.join(process.cwd(), 'cert', 'localhost.pem');

const TLS_KEY_PATH =
  pickPath(
    process.env.TLS_KEY,
    process.env.TLS_KEY_PATH,
    path.join(process.cwd(), 'cert', 'localhost-key.pem'),
    path.join(process.cwd(), 'cert', 'localhost-key.key'),
    path.join(process.cwd(), 'certs', 'localhost-key.pem'),
    path.join(process.cwd(), 'certs', 'localhost-key.key')
  ) || path.join(process.cwd(), 'cert', 'localhost-key.pem');

// Build Set of allowed origins (strict matching, no prefix checks)
const buildAllowedOriginsSet = (): Set<string> => {
  const origins = new Set<string>();
  
  // Add exact localhost variants
  origins.add(`http://localhost:${HTTP_PORT}`);
  origins.add(`https://localhost:${HTTPS_PORT}`);
  origins.add(`http://127.0.0.1:${HTTP_PORT}`);
  origins.add(`https://127.0.0.1:${HTTPS_PORT}`);
  
  // Add ChatGPT origins for production
  origins.add('https://chat.openai.com');
  origins.add('https://chatgpt.com');
  
  // Add Next.js frontend URL from env (for Vercel deployment)
  const nextJsUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (nextJsUrl) {
    try {
      const url = new URL(nextJsUrl);
      const normalized = `${url.protocol}//${url.host}`;
      origins.add(normalized);
    } catch {
      // Invalid URL, skip
    }
  }
  
  // Add localhost:3000 for Next.js dev (common default)
  origins.add('http://localhost:3000');
  
  // Add origins from env
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  
  for (const origin of envOrigins) {
    try {
      // Normalize origin to "protocol://host[:port]"
      const url = new URL(origin);
      const normalized = `${url.protocol}//${url.host}`;
      origins.add(normalized);
    } catch {
      // Invalid URL, skip
    }
  }
  
  return origins;
};

const ALLOWED_ORIGINS_SET = buildAllowedOriginsSet();
const ALLOWED_ORIGINS = Array.from(ALLOWED_ORIGINS_SET);

// SSE connection manager for MCP transport
interface SSEClient {
  id: string;
  res: express.Response;
  lastActivity: number;
}

const sseClients = new Map<string, SSEClient>();

// Clean up stale SSE connections every 5 minutes
setInterval(() => {
  const now = Date.now();
  const staleTimeout = 5 * 60 * 1000; // 5 minutes
  for (const [id, client] of sseClients.entries()) {
    if (now - client.lastActivity > staleTimeout) {
      try {
        client.res.end();
      } catch {
        // Connection already closed
      }
      sseClients.delete(id);
    }
  }
}, 60000); // Check every minute

// Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Error helper
const err = (code: string, message: string, details?: unknown, correlationId?: string) => ({
  ok: false,
  error: {
    code,
    message,
    details,
    correlationId: correlationId || 'unknown',
  },
});

// Input validation schemas
const PingParamsSchema = z.object({
  name: z.string().optional(),
});

// Output validation schemas
const PingResultSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  timestamp: z.string(),
});

const ShopifyResultSchema = z.object({
  ok: z.literal(true),
  products: z.array(z.any()),
  total: z.number(),
  query: z.string(),
});

const StripeResultSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string(),
  url: z.string(),
  items: z.array(z.any()),
  successUrl: z.string(),
  cancelUrl: z.string(),
  createdAt: z.string(),
  idempotencyKey: z.string().optional(),
});

const SimpleCheckoutResultSchema = z.object({
  checkout_url: z.string(),
  session_id: z.string(),
  payment_intent: z.string().nullable(),
});

const PaymentStatusResultSchema = z.object({
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

const HealthResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  timestamp: z.string(),
  demoMode: z.boolean(),
});

const ReadyResponseSchema = z.object({
  ok: z.literal(true),
  ready: z.literal(true),
});

// Manifest and list-tools output validation schemas
const ManifestToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.any(),
});

const MCPManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  homepage: z.string(),
  tools: z.array(ManifestToolSchema),
});

const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
});

const ListToolsResponseSchema = z.object({
  tools: z.array(ToolDefinitionSchema),
});

// Express app
const app = express();

// Security headers - relaxed for local dev while keeping other safeguards
// TODO: In production, enable strict CSP and HSTS:
//   contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], ... } },
//   hsts: { maxAge: 31536000, includeSubDomains: true }
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginEmbedderPolicy: false, // Safari can be strict about this
  })
);

// CORS - strict origin control with exact matching (no prefix checks)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, same-origin fetch)
      if (!origin) return callback(null, true);
      
      try {
        // Parse and normalize origin to "protocol://host[:port]"
        const url = new URL(origin);
        const normalized = `${url.protocol}//${url.host}`;
        
        // Check Set.has(normalized) - exact match, no prefix checks
        if (ALLOWED_ORIGINS_SET.has(normalized)) {
          return callback(null, true);
        }
      } catch {
        // Invalid origin URL format
      }
      
      // On deny, call callback with CORS_NOT_ALLOWED error
      callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Correlation-ID', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Correlation-ID'],
  })
);

// Request timeout (10s)
app.use((req, res, next) => {
  req.setTimeout(10_000);
  next();
});

// Correlation ID middleware (must be before body parser for error handling)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const cid = (req.headers['x-correlation-id'] as string) || uuid();
  (req as any).cid = cid;
  res.setHeader('x-correlation-id', cid);
  next();
});

// SSE endpoint MUST be before body parser and static middleware for immediate response
// Helper function to send SSE message with MCP transport spec format
const sendSSEMessage = (res: express.Response, event: string, data: any) => {
  const eventId = uuid();
  const jsonData = JSON.stringify(data);
  res.write(`id: ${eventId}\n`);
  res.write(`event: ${event}\n`);
  res.write(`data: ${jsonData}\n\n`);
};

// Helper function to get MCP manifest payload (needed for SSE init event)
const getMCPManifestPayload = (req: express.Request) => {
  const productionUrl = process.env.MCP_SERVER_URL || 
    (req.headers.host ? `https://${req.headers.host}` : `https://localhost:${HTTPS_PORT}`);
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
};

// MCP SSE endpoint (Server-Sent Events transport) - MUST be before body parser
app.get('/sse', (req, res) => {
  const correlationId = (req as any).cid || uuid();
  const connectionId = uuid();

  // Set SSE headers per MCP transport spec - CRITICAL for ChatGPT compatibility
  // ChatGPT MCP connector requires strict HTTP/2 + TLS 1.3 compliance
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx/proxy buffering
  res.setHeader('Content-Encoding', 'identity'); // Required by ChatGPT MCP connector
  // Note: Transfer-Encoding: chunked is NOT set - HTTP/2 handles framing automatically
  // Setting it manually causes 502 errors with HTTP/2
  
  // Flush headers IMMEDIATELY - must come BEFORE sending any event
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Register this SSE client
  const client: SSEClient = {
    id: connectionId,
    res,
    lastActivity: Date.now(),
  };
  sseClients.set(connectionId, client);

  logger.info({ correlationId, connectionId }, 'SSE connection established');

  // Send init event with MCP manifest IMMEDIATELY after flushHeaders
  // This must happen within 100ms for ChatGPT compatibility
  const manifest = getMCPManifestPayload(req);
  sendSSEMessage(res, 'mcp.init', manifest);
  
  // Force flush to ensure immediate transmission
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }

  // Handle client disconnect
  req.on('close', () => {
    logger.info({ correlationId, connectionId }, 'SSE connection closed');
    sseClients.delete(connectionId);
    res.end();
  });

  // Keep connection alive with periodic ping (MCP transport spec: mcp.ping)
  const keepAliveInterval = setInterval(() => {
    if (!sseClients.has(connectionId)) {
      clearInterval(keepAliveInterval);
      return;
    }
    try {
      sendSSEMessage(res, 'mcp.ping', { timestamp: new Date().toISOString() });
      client.lastActivity = Date.now();
    } catch (err) {
      clearInterval(keepAliveInterval);
      sseClients.delete(connectionId);
    }
  }, 30000); // Send ping every 30 seconds

  // Clean up interval on disconnect
  req.on('close', () => {
    clearInterval(keepAliveInterval);
  });
});

// Body parsing (after SSE route to avoid buffering)
app.use(express.json({ limit: '10mb' }));

// Structured logging middleware (after SSE route)
app.use(
  pinoHttp({
    logger,
    genReqId: (req: express.Request) => (req as any).cid || uuid(),
  })
);

// Helper function to return MCP discovery metadata
const getMCPDiscoveryMetadata = (req: express.Request) => {
  const productionUrl = process.env.MCP_SERVER_URL || 
    (req.headers.host ? `https://${req.headers.host}` : `https://localhost:${HTTPS_PORT}`);
  return {
    mcp: true,
    name: 'partner-integration-demo',
    description: 'MCP server powering Shopify + Stripe',
    manifest: '/mcp-manifest.json',
    sse: '/sse', // SSE endpoint for MCP transport
    homepage: productionUrl,
  };
};

// Root route - return MCP metadata JSON (GET and POST)
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(getMCPDiscoveryMetadata(req));
});

// Handle POST to root (ChatGPT connector sends POST during setup)
app.post('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(getMCPDiscoveryMetadata(req));
});

// Developer Sandbox UI route (optional, controlled by DEV_UI_ENABLED)
app.get('/ui', (_req, res) => {
  const devUIEnabled = process.env.DEV_UI_ENABLED === 'true';
  if (!devUIEnabled) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Developer Sandbox UI is disabled. Set DEV_UI_ENABLED=true to enable.',
      },
    });
    return;
  }
  const demoFile = path.join(process.cwd(), 'src', 'public', 'demo.html');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(demoFile);
});

// Serve static files - use process.cwd() for development (after routes to avoid conflicts)
const publicPath = path.join(process.cwd(), 'src', 'public');
app.use(express.static(publicPath));

// Handle favicon and icon requests to avoid 404s (browsers/clients probe for these)
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end(); // No Content
});
app.get('/favicon.png', (_req, res) => {
  res.status(204).end(); // No Content
});
app.get('/favicon.svg', (_req, res) => {
  res.status(204).end(); // No Content
});
app.get('/apple-touch-icon.png', (_req, res) => {
  res.status(204).end(); // No Content
});
app.get('/apple-touch-icon-precomposed.png', (_req, res) => {
  res.status(204).end(); // No Content
});

// Pre-compute manifest payload to avoid computation on every request
let cachedManifest: any = null;
const getCachedManifest = (req: express.Request) => {
  if (cachedManifest) {
    // Update homepage URL if needed (in case host changes)
    const productionUrl = process.env.MCP_SERVER_URL || 
      (req.headers.host ? `https://${req.headers.host}` : `https://localhost:${HTTPS_PORT}`);
    return { ...cachedManifest, homepage: productionUrl };
  }
  return null;
};

// MCP Manifest with cache headers and Zod validation
app.get('/mcp-manifest.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // Use production URL from env, or construct from request, or fallback to localhost
  const productionUrl = process.env.MCP_SERVER_URL || 
    (req.headers.host ? `https://${req.headers.host}` : `https://localhost:${HTTPS_PORT}`);
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
  
  // Cache the manifest (without homepage which may vary)
  if (!cachedManifest) {
    cachedManifest = { ...payload };
  }
  
  const validated = MCPManifestSchema.parse(payload);
  res.json(validated);
});


// Health check
app.get('/healthz', (_req, res) => {
  const health = {
    ok: true,
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    demoMode: DEMO_MODE,
  };
  const validated = HealthResponseSchema.parse(health);
  res.json(validated);
});

// Ready probe (for Cloud Run / Kubernetes)
app.get('/healthz/ready', (_req, res) => {
  // TODO: Add checks for Redis, DB, etc. when added
  const ready = {
    ok: true,
    ready: true as const,
  };
  const validated = ReadyResponseSchema.parse(ready);
  res.json(validated);
});

// List tools with Zod validation
app.get('/tools', (_req, res) => {
  const payload = {
    tools: [
      {
        name: 'ping',
        description: 'Ping tool that returns a greeting',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name to greet' },
          },
        },
      },
      {
        name: 'shopify.searchProducts',
        description: 'Search products (mock)',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'stripe.createCheckoutSession',
        description: 'Create Stripe checkout session (legacy API)',
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
        name: 'stripe_create_checkout_session',
        description: 'Create Stripe checkout session with product name and price',
        inputSchema: {
          type: 'object',
          required: ['productName', 'price'],
          properties: {
            productName: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string', default: 'usd' },
          },
        },
      },
      {
        name: 'stripe_get_payment_status',
        description: 'Get payment status for a payment intent',
        inputSchema: {
          type: 'object',
          required: ['paymentIntentId'],
          properties: {
            paymentIntentId: { type: 'string' },
          },
        },
      },
    ],
  };
  const validated = ListToolsResponseSchema.parse(payload);
  res.json(validated);
});

// Helper function to send tool response (either JSON or SSE)
const sendToolResponse = (
  res: express.Response,
  correlationId: string,
  toolName: string,
  result: any,
  sseConnectionId?: string,
  error?: any
) => {
  // If SSE connection ID is provided and connection exists, stream via SSE
  if (sseConnectionId) {
    const sseClient = sseClients.get(sseConnectionId);
    if (sseClient) {
      sseClient.lastActivity = Date.now();
      
      if (error) {
        // Send error event (MCP transport spec: mcp.error)
        sendSSEMessage(sseClient.res, 'mcp.error', {
          tool: toolName,
          correlationId,
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message || 'An error occurred',
            details: error.details,
          },
        });
      } else {
        // Send tool response event (MCP transport spec: mcp.tool_response)
        sendSSEMessage(sseClient.res, 'mcp.tool_response', {
          tool: toolName,
          correlationId,
          result,
        });
      }
      
      // Return empty 202 Accepted for POST requests when using SSE
      res.status(202).json({ ok: true, message: 'Response streamed via SSE' });
      return;
    }
  }

  // Default: return JSON response
  if (error) {
    res.status(error.status || 500).json(error);
  } else {
    res.json(result);
  }
};

// Tool execution endpoint
app.post('/tools/:toolName', async (req, res) => {
  const correlationId = (req as any).cid || uuid();
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  const sseConnectionId = req.headers['x-sse-connection-id'] as string | undefined;
  const { toolName } = req.params;

  try {
    switch (toolName) {
      case 'ping': {
        const params = PingParamsSchema.parse(req.body.params || {});
        const name = params.name || 'World';
        const payload = {
          ok: true as const,
          message: `Hello, ${name}!`,
          timestamp: new Date().toISOString(),
        };
        const validated = PingResultSchema.parse(payload);
        sendToolResponse(res, correlationId, toolName, validated, sseConnectionId);
        return;
      }

      case 'shopify.searchProducts': {
        const params = SearchProductsParamsSchema.parse(req.body.params || {});
        const result = await searchProducts(params, DEMO_MODE);
        const validated = ShopifyResultSchema.parse(result);
        sendToolResponse(res, correlationId, toolName, validated, sseConnectionId);
        return;
      }

      case 'stripe.createCheckoutSession': {
        const params = CreateCheckoutSessionParamsSchema.parse(req.body.params || {});
        const result = await createCheckoutSessionLegacy(params, DEMO_MODE, idempotencyKey);
        const validated = StripeResultSchema.parse(result);
        sendToolResponse(res, correlationId, toolName, validated, sseConnectionId);
        return;
      }

      case 'stripe_create_checkout_session': {
        const params = SimpleCheckoutSessionParamsSchema.parse(req.body.params || {});
        const result = await createCheckoutSession(
          params.productName,
          params.price,
          params.currency,
          DEMO_MODE,
          params.successUrl,
          params.cancelUrl
        );
        const validated = SimpleCheckoutResultSchema.parse(result);
        sendToolResponse(res, correlationId, toolName, validated, sseConnectionId);
        return;
      }

      case 'stripe_get_payment_status': {
        const params = GetPaymentStatusParamsSchema.parse(req.body.params || {});
        const result = await getPaymentStatus(params.paymentIntentId, DEMO_MODE);
        const validated = PaymentStatusResultSchema.parse(result);
        sendToolResponse(res, correlationId, toolName, validated, sseConnectionId);
        return;
      }

      default:
        res.status(404).json(err('UNKNOWN_TOOL', `Tool not found: ${toolName}`, undefined, correlationId));
        return;
    }
  } catch (errInstance: any) {
    logger.error({ err: errInstance, correlationId, toolName }, 'Tool execution error');

    if (errInstance instanceof z.ZodError) {
      const errorPayload = {
        code: 'BAD_PARAMS',
        message: 'Invalid parameters',
        details: errInstance.errors.map((e) => e.message),
        status: 400,
      };
      sendToolResponse(res, correlationId, toolName, null, sseConnectionId, errorPayload);
      return;
    }

    // Handle timeout errors
    if (errInstance.code === 'ECONNABORTED' || errInstance.message?.includes('timeout')) {
      const errorPayload = {
        code: 'TIMEOUT',
        message: 'Request timeout',
        status: 500,
      };
      sendToolResponse(res, correlationId, toolName, null, sseConnectionId, errorPayload);
      return;
    }

    // Handle upstream errors
    if (errInstance.statusCode >= 400 && errInstance.statusCode < 500) {
      const errorPayload = {
        code: 'UPSTREAM_4XX',
        message: `Upstream error: ${errInstance.message}`,
        status: 502,
      };
      sendToolResponse(res, correlationId, toolName, null, sseConnectionId, errorPayload);
      return;
    }

    if (errInstance.statusCode >= 500) {
      const errorPayload = {
        code: 'UPSTREAM_5XX',
        message: `Upstream error: ${errInstance.message}`,
        status: 502,
      };
      sendToolResponse(res, correlationId, toolName, null, sseConnectionId, errorPayload);
      return;
    }

    const errorPayload = {
      code: 'INTERNAL_ERROR',
      message: errInstance.message || 'Internal server error',
      status: 500,
    };
    sendToolResponse(res, correlationId, toolName, null, sseConnectionId, errorPayload);
  }
});

// 404 handler
app.use((req, res) => {
  const correlationId = (req as any).cid || uuid();
  res.status(404).json(err('NOT_FOUND', `Path not found: ${req.path}`, undefined, correlationId));
});

// Error handler
app.use((errInstance: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const correlationId = (req as any).cid || uuid();
  
  // Handle CORS_NOT_ALLOWED error from CORS middleware
  if (errInstance.message === 'CORS_NOT_ALLOWED') {
    logger.warn({ origin: req.headers.origin, correlationId }, 'CORS blocked');
    return res.status(403).json(err('CORS_BLOCKED', 'Origin not allowed', undefined, correlationId));
  }
  
  // Handle JSON parse errors (body parser)
  if (errInstance.type === 'entity.parse.failed') {
    logger.warn({ correlationId }, 'Malformed JSON body');
    return res.status(400).json(err('BAD_JSON', 'Malformed JSON body', undefined, correlationId));
  }
  
  logger.error({ err: errInstance, correlationId }, 'Unhandled error');
  res.status(500).json(err('INTERNAL_ERROR', errInstance.message || 'Internal server error', undefined, correlationId));
});

const startHttpServer = () => {
  app.listen(HTTP_PORT, () => {
    logger.info(
      { protocol: 'http', port: HTTP_PORT, demoMode: DEMO_MODE, allowedOrigins: ALLOWED_ORIGINS },
      'MCP HTTP Server started (HTTP)'
    );
    console.log(`🚀 MCP HTTP Server running on http://localhost:${HTTP_PORT}`);
    console.log(`📊 Demo mode: ${DEMO_MODE ? 'ON' : 'OFF'}`);
    console.log(`🔒 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });
};

const httpsMaterialsAvailable = existsSync(TLS_CERT_PATH) && existsSync(TLS_KEY_PATH);
const usingSamePort = HTTPS_PORT === HTTP_PORT;

if (ENABLE_DEV_HTTPS && httpsMaterialsAvailable) {
  const httpsServer = https.createServer(
    {
      key: readFileSync(TLS_KEY_PATH),
      cert: readFileSync(TLS_CERT_PATH),
    },
    app
  );

  httpsServer.listen(HTTPS_PORT, () => {
    logger.info(
      { protocol: 'https', port: HTTPS_PORT, demoMode: DEMO_MODE, allowedOrigins: ALLOWED_ORIGINS },
      'MCP HTTP Server started (HTTPS)'
    );
    console.log(`🔐 MCP HTTP Server running on https://localhost:${HTTPS_PORT}`);
    console.log(`📊 Demo mode: ${DEMO_MODE ? 'ON' : 'OFF'}`);
    console.log(`🔒 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  });

  if (!usingSamePort) {
    http
      .createServer((req, res) => {
        const hostHeader = req.headers.host || `localhost:${HTTP_PORT}`;
        const host = hostHeader.split(':')[0] || 'localhost';
        const target = `https://${host}:${HTTPS_PORT}${req.url ?? ''}`;
        res.writeHead(308, {
          Location: target,
          'Content-Type': 'text/plain',
        });
        res.end(`Please use HTTPS: ${target}\n`);
      })
      .listen(HTTP_PORT, () => {
        logger.info(
          { from: HTTP_PORT, to: HTTPS_PORT },
          'Redirecting HTTP traffic to HTTPS endpoint'
        );
        console.log(`➡️  Redirecting http://localhost:${HTTP_PORT} -> https://localhost:${HTTPS_PORT}`);
      });
  } else {
    console.log('ℹ️ HTTPS and HTTP share the same port; HTTP listener disabled to avoid conflicts.');
  }
} else {
  if (ENABLE_DEV_HTTPS && !httpsMaterialsAvailable) {
    logger.warn(
      { certPath: TLS_CERT_PATH, keyPath: TLS_KEY_PATH },
      'HTTPS requested but certificate or key not found. Serving HTTP only.'
    );
  }
  startHttpServer();
}
