import { ReadyResponseSchema } from '../../lib/schemas.js';
import { handleOptionsRequest, setCorsHeaders } from '../../lib/cors.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

async function checkRedis(): Promise<{ ok: boolean; error?: string }> {
  const redisUrl = process.env.REDIS_URL;
  
  // If REDIS_URL is not set, consider it ready (optional for local dev)
  if (!redisUrl) {
    return { ok: true };
  }

  try {
    const { createClient } = await import('redis');
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: false,
      },
    });

    await client.connect();
    await client.ping();
    await client.quit();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message || 'Connection failed' };
  }
}

export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const response = handleOptionsRequest(origin);
  return response ?? new Response(null, { status: 403 });
}

export async function GET(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const headers = setCorsHeaders(new Headers({ 'Content-Type': 'application/json' }), origin);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');

  // Only check Redis if REDIS_URL is configured
  if (process.env.REDIS_URL) {
    const redisCheck = await checkRedis();
    if (!redisCheck.ok) {
      const errorResponse = {
        ok: false,
        ready: false,
        reason: 'redis_unavailable',
        action: 'Restore or recreate Upstash Redis (free tier may delete after inactivity), update REDIS_URL, redeploy',
        docs: 'See README: Troubleshooting',
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers,
      });
    }
  }

  const ready = {
    ok: true,
    ready: true as const,
  };
  const validated = ReadyResponseSchema.parse(ready);
  return new Response(JSON.stringify(validated), { status: 200, headers });
}
