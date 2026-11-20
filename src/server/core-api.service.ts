import {ValidatedSearchQuery} from './validation';

export interface CoreRateLimitMeta {
  limit: number | null;
  remaining: number | null;
  retryAfter: string | null;
}

export interface CoreUpstreamResult {
  query: string;
  totalHits: number;
  limit: number;
  offset: number;
  results: unknown[];
  authenticated: boolean;
  rateLimit: CoreRateLimitMeta;
}

export class CoreUpstreamError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly rateLimit?: CoreRateLimitMeta,
  ) {
    super(message);
    this.name = 'CoreUpstreamError';
  }
}

export interface CoreServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.core.ac.uk/v3';
const DEFAULT_TIMEOUT_MS = 15000;

function parseHeaderInt(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractRateLimit(headers: Headers): CoreRateLimitMeta {
  return {
    limit: parseHeaderInt(headers.get('x-ratelimit-limit')),
    remaining: parseHeaderInt(headers.get('x-ratelimit-remaining')),
    retryAfter: headers.get('x-ratelimit-retry-after') ?? headers.get('retry-after'),
  };
}

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, '');
}

/**
 * Server-side service that proxies search requests to the official CORE API v3.
 * Preserves the exact Boolean query string and keeps CORE_API_KEY strictly on the server.
 */
export async function searchCoreWorks(
  params: ValidatedSearchQuery,
  options: CoreServiceOptions = {},
): Promise<CoreUpstreamResult> {
  const rawApiKey = options.apiKey ?? process.env['CORE_API_KEY'] ?? '';
  const apiKey =
    rawApiKey && rawApiKey !== 'YOUR_CORE_API_KEY' && rawApiKey.trim().length > 0
      ? rawApiKey.trim()
      : '';
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env['CORE_API_BASE_URL'] ?? DEFAULT_BASE_URL,
  );
  const fetchFn = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const url = new URL(`${baseUrl}/search/works`);
  url.searchParams.set('q', params.q);
  url.searchParams.set('limit', String(params.limit));
  url.searchParams.set('offset', String(params.offset));

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'ResearchLens/1.0',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutHandle);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new CoreUpstreamError(
        'The CORE API request timed out. Please try again or narrow your Boolean query.',
        504,
        'UPSTREAM_TIMEOUT',
      );
    }
    throw new CoreUpstreamError(
      'Unable to reach the CORE API service. Check network connectivity and try again.',
      502,
      'UPSTREAM_NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

  const rateLimit = extractRateLimit(response.headers);

  if (!response.ok) {
    let upstreamMessage = '';
    try {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const errorBody = (await response.json()) as {message?: string; error?: string};
        upstreamMessage = errorBody.message ?? errorBody.error ?? '';
      }
    } catch {
      // Ignore non-JSON error payloads from upstream gateways
    }

    if (response.status === 429) {
      const retryNote = rateLimit.retryAfter
        ? ` Retry after ${rateLimit.retryAfter}.`
        : ' Please wait a few minutes before retrying.';
      const keyNote = apiKey
        ? ''
        : ' Configure a free CORE_API_KEY in the server environment to increase your request quota.';
      throw new CoreUpstreamError(
        `CORE API rate limit exceeded.${retryNote}${keyNote}`,
        429,
        'CORE_RATE_LIMITED',
        rateLimit,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new CoreUpstreamError(
        'CORE API rejected the configured credentials. Verify CORE_API_KEY in the backend environment.',
        response.status,
        'CORE_AUTH_ERROR',
        rateLimit,
      );
    }

    if (response.status === 400) {
      throw new CoreUpstreamError(
        upstreamMessage ||
          'CORE API could not parse this Boolean query. Check your operators and parentheses.',
        400,
        'CORE_BAD_QUERY',
        rateLimit,
      );
    }

    if (response.status >= 500) {
      throw new CoreUpstreamError(
        'CORE API is currently experiencing an upstream service issue. Please try again shortly.',
        502,
        'CORE_UPSTREAM_UNAVAILABLE',
        rateLimit,
      );
    }

    throw new CoreUpstreamError(
      upstreamMessage || `CORE API returned an unexpected status (${response.status}).`,
      response.status,
      'CORE_UPSTREAM_ERROR',
      rateLimit,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CoreUpstreamError(
      'CORE API returned an unreadable response payload.',
      502,
      'CORE_INVALID_JSON',
      rateLimit,
    );
  }

  const parsed = payload as {
    totalHits?: unknown;
    limit?: unknown;
    offset?: unknown;
    results?: unknown;
  };

  const results = Array.isArray(parsed?.results) ? parsed.results : [];
  const totalHits =
    typeof parsed?.totalHits === 'number' && Number.isFinite(parsed.totalHits)
      ? parsed.totalHits
      : results.length;
  const resolvedLimit =
    typeof parsed?.limit === 'number' && Number.isFinite(parsed.limit)
      ? parsed.limit
      : params.limit;
  const resolvedOffset =
    typeof parsed?.offset === 'number' && Number.isFinite(parsed.offset)
      ? parsed.offset
      : params.offset;

  return {
    query: params.q,
    totalHits,
    limit: resolvedLimit,
    offset: resolvedOffset,
    results,
    authenticated: Boolean(apiKey),
    rateLimit,
  };
}
