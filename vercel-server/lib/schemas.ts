import { z } from 'zod';

// Input validation schemas
export const PingParamsSchema = z.object({
  name: z.string().optional(),
});

// Output validation schemas
export const PingResultSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  timestamp: z.string(),
});

export const ShopifyResultSchema = z.object({
  ok: z.literal(true),
  products: z.array(z.any()),
  total: z.number(),
  query: z.string(),
});

export const StripeResultSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string(),
  url: z.string(),
  items: z.array(z.any()),
  successUrl: z.string(),
  cancelUrl: z.string(),
  createdAt: z.string(),
  idempotencyKey: z.string().optional(),
});

export const SimpleCheckoutResultSchema = z.object({
  checkout_url: z.string(),
  session_id: z.string(),
  payment_intent: z.string().nullable(),
});

export const PaymentStatusResultSchema = z.object({
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal('ok'),
  timestamp: z.string(),
  demoMode: z.boolean(),
});

export const ReadyResponseSchema = z.object({
  ok: z.literal(true),
  ready: z.literal(true),
});

// Manifest and list-tools output validation schemas
export const ManifestToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.any(),
});

export const MCPManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  homepage: z.string(),
  tools: z.array(ManifestToolSchema),
});

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
});

export const ListToolsResponseSchema = z.object({
  tools: z.array(ToolDefinitionSchema),
});

