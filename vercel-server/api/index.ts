import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs18.x',
};

/**
 * Root endpoint - MCP discovery metadata
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  // Set CORS headers
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Cache-Control', 'no-store');

  // Return discovery JSON
  const metadata = {
    mcp: true,
    name: 'partner-integration-demo',
    manifest: '/api/mcp-manifest.json',
    sse: '/api/sse',
  };

  return res.status(200).json(metadata);
}
