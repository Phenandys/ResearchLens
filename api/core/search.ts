import type {IncomingMessage, ServerResponse} from 'node:http';
import {CoreUpstreamError, searchCoreWorks} from '../../src/server/core-api.service';
import {validateSearchParams} from '../../src/server/validation';

interface VercelLikeRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getQueryParam(
  req: VercelLikeRequest,
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const fromUrl = searchParams.get(key);
  if (fromUrl !== null) {
    return fromUrl;
  }
  const fromReq = req.query?.[key];
  if (Array.isArray(fromReq)) {
    return fromReq[0];
  }
  return typeof fromReq === 'string' ? fromReq : undefined;
}

/**
 * Vercel Serverless Function for GET /api/core/search.
 * Reuses the shared backend validation and CORE API v3 proxy service.
 */
export default async function handler(
  req: VercelLikeRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, {
      code: 'METHOD_NOT_ALLOWED',
      error: 'Only GET requests are supported on /api/core/search.',
    });
    return;
  }

  const parsedUrl = new URL(req.url ?? '/', 'http://localhost');
  const validation = validateSearchParams({
    q: getQueryParam(req, parsedUrl.searchParams, 'q'),
    limit: getQueryParam(req, parsedUrl.searchParams, 'limit'),
    offset: getQueryParam(req, parsedUrl.searchParams, 'offset'),
  });

  if (!validation.valid || !validation.data) {
    sendJson(res, 400, {
      code: validation.code ?? 'VALIDATION_ERROR',
      error: validation.error ?? 'Invalid search parameters.',
    });
    return;
  }

  try {
    const result = await searchCoreWorks(validation.data);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    sendJson(res, 200, result);
  } catch (err: unknown) {
    if (err instanceof CoreUpstreamError) {
      sendJson(res, err.statusCode, {
        code: err.code,
        error: err.message,
        rateLimit: err.rateLimit ?? null,
      });
      return;
    }

    sendJson(res, 500, {
      code: 'INTERNAL_SERVER_ERROR',
      error: 'An unexpected error occurred while searching CORE.',
    });
  }
}
