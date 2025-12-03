import { ReadyResponseSchema } from '../../lib/schemas.js';
import { handleOptionsRequest, setCorsHeaders } from '../../lib/cors.js';

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
  const headers = setCorsHeaders(new Headers({ 'Content-Type': 'application/json' }), origin);

  const ready = {
    ok: true,
    ready: true as const,
  };
  const validated = ReadyResponseSchema.parse(ready);
  return new Response(JSON.stringify(validated), { status: 200, headers });
}
