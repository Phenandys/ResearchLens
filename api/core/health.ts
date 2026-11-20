import type {IncomingMessage, ServerResponse} from 'node:http';

/**
 * Vercel Serverless Function for GET /api/core/health.
 * Reports API readiness and whether CORE_API_KEY is configured without exposing secrets.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        code: 'METHOD_NOT_ALLOWED',
        error: 'Only GET requests are supported on /api/core/health.',
      }),
    );
    return;
  }

  const rawKey = process.env['CORE_API_KEY'] ?? '';
  const hasApiKey = Boolean(
    rawKey && rawKey !== 'YOUR_CORE_API_KEY' && rawKey.trim().length > 0,
  );

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      status: 'ok',
      provider: 'CORE API v3',
      apiKeyConfigured: hasApiKey,
    }),
  );
}
