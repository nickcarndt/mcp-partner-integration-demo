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
import { createCheckoutSession, CreateCheckoutSessionParamsSchema } from './tools/stripe.js';

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

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Structured logging middleware
app.use(
  pinoHttp({
    logger,
    genReqId: (req: express.Request) => (req as any).cid || uuid(),
  })
);

// Serve static files - use process.cwd() for development
const publicPath = path.join(process.cwd(), 'src', 'public');
app.use(express.static(publicPath));

// Root route - serve demo.html with no-cache headers (dev mode)
app.get('/', (_req, res) => {
  const demoFile = path.join(process.cwd(), 'src', 'public', 'demo.html');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(demoFile);
});

// MCP Manifest with cache headers and Zod validation
app.get('/mcp-manifest.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const homepageUrl = `https://localhost:${HTTPS_PORT}`;
  const payload = {
    name: 'partner-integration-demo',
    version: '0.1.1',
    description: 'Demo MCP tools for partner integrations',
    homepage: homepageUrl,
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
        description: 'Mock product search',
        parameters: {
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
        description: 'Mock Stripe Checkout Session',
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
    ],
  };
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
        description: 'Create Stripe checkout session (mock)',
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
    ],
  };
  const validated = ListToolsResponseSchema.parse(payload);
  res.json(validated);
});

// Tool execution endpoint
app.post('/tools/:toolName', async (req, res) => {
  const correlationId = (req as any).cid || uuid();
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
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
        res.json(validated);
        return;
      }

      case 'shopify.searchProducts': {
        const params = SearchProductsParamsSchema.parse(req.body.params || {});
        const result = await searchProducts(params, DEMO_MODE);
        const validated = ShopifyResultSchema.parse(result);
        res.json(validated);
        return;
      }

      case 'stripe.createCheckoutSession': {
        const params = CreateCheckoutSessionParamsSchema.parse(req.body.params || {});
        const result = await createCheckoutSession(params, DEMO_MODE, idempotencyKey);
        const validated = StripeResultSchema.parse(result);
        res.json(validated);
        return;
      }

      default:
        res.status(404).json(err('UNKNOWN_TOOL', `Tool not found: ${toolName}`, undefined, correlationId));
        return;
    }
  } catch (errInstance: any) {
    logger.error({ err: errInstance, correlationId, toolName }, 'Tool execution error');

    if (errInstance instanceof z.ZodError) {
      res.status(400).json(
        err('BAD_PARAMS', 'Invalid parameters', errInstance.errors.map((e) => e.message), correlationId)
      );
      return;
    }

    // Handle timeout errors
    if (errInstance.code === 'ECONNABORTED' || errInstance.message?.includes('timeout')) {
      res.status(500).json(err('TIMEOUT', 'Request timeout', undefined, correlationId));
      return;
    }

    // Handle upstream errors
    if (errInstance.statusCode >= 400 && errInstance.statusCode < 500) {
      res.status(502).json(
        err('UPSTREAM_4XX', `Upstream error: ${errInstance.message}`, undefined, correlationId)
      );
      return;
    }

    if (errInstance.statusCode >= 500) {
      res.status(502).json(
        err('UPSTREAM_5XX', `Upstream error: ${errInstance.message}`, undefined, correlationId)
      );
      return;
    }

    res.status(500).json(err('INTERNAL_ERROR', errInstance.message || 'Internal server error', undefined, correlationId));
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
