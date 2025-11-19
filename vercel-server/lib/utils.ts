import { v4 as uuid } from 'uuid';

export const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * Get the production URL for the MCP server
 * Uses MCP_SERVER_URL env var or constructs from Vercel deployment
 */
export function getProductionUrl(): string {
  // Use MCP_SERVER_URL if explicitly set
  if (process.env.MCP_SERVER_URL) {
    return process.env.MCP_SERVER_URL;
  }

  // Use VERCEL_URL (available in all Vercel deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback for local development
  return 'https://localhost:3000';
}

/**
 * Generate correlation ID from request headers or create new one
 */
export function getCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const cid = headers['x-correlation-id'];
  if (typeof cid === 'string') {
    return cid;
  }
  if (Array.isArray(cid) && cid.length > 0) {
    return cid[0];
  }
  return uuid();
}

/**
 * Error response helper
 */
export function err(code: string, message: string, details?: unknown, correlationId?: string) {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
      correlationId: correlationId || 'unknown',
    },
  };
}

/**
 * Build allowed origins set for CORS
 */
export function buildAllowedOriginsSet(): Set<string> {
  const origins = new Set<string>();
  
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
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null, allowedOrigins: Set<string>): boolean {
  if (!origin) return true; // Allow requests with no origin
  
  try {
    const url = new URL(origin);
    const normalized = `${url.protocol}//${url.host}`;
    return allowedOrigins.has(normalized);
  } catch {
    return false;
  }
}

