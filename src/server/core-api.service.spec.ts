import {CoreUpstreamError, searchCoreWorks} from './core-api.service';

describe('server/core-api.service', () => {
  it('forwards exact Boolean query to CORE v3 with Authorization header when CORE_API_KEY is set', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    const mockFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(
        JSON.stringify({
          totalHits: 120,
          limit: 20,
          offset: 0,
          results: [{id: 55, title: 'Drone Logistics', yearPublished: 2024}],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '99',
          },
        },
      );
    };

    const result = await searchCoreWorks(
      {q: '(drone AND (package OR delivery))', limit: 20, offset: 0},
      {apiKey: 'secret-test-key', fetchImpl: mockFetch},
    );

    const parsedUrl = new URL(capturedUrl);
    expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://api.core.ac.uk/v3/search/works');
    expect(parsedUrl.searchParams.get('q')).toBe('(drone AND (package OR delivery))');
    expect(parsedUrl.searchParams.get('limit')).toBe('20');
    expect(parsedUrl.searchParams.get('offset')).toBe('0');
    expect(capturedHeaders['Authorization']).toBe('Bearer secret-test-key');

    expect(result.authenticated).toBe(true);
    expect(result.totalHits).toBe(120);
    expect(result.rateLimit).toEqual({limit: 100, remaining: 99, retryAfter: null});
  });

  it('omits Authorization header when API key is missing or placeholder', async () => {
    let capturedHeaders: Record<string, string> = {};

    const mockFetch: typeof fetch = async (_input, init) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({totalHits: 0, results: []}), {
        status: 200,
        headers: {'content-type': 'application/json'},
      });
    };

    const result = await searchCoreWorks(
      {q: 'drone', limit: 10, offset: 0},
      {apiKey: 'YOUR_CORE_API_KEY', fetchImpl: mockFetch},
    );

    expect(capturedHeaders['Authorization']).toBeUndefined();
    expect(result.authenticated).toBe(false);
  });

  it('maps HTTP 429 responses to CoreUpstreamError with rate-limit metadata', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response('Too Many Requests', {
        status: 429,
        headers: {
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-retry-after': '2026-11-20T12:46:53+0000',
        },
      });

    await expect(
      searchCoreWorks({q: 'drone', limit: 10, offset: 0}, {apiKey: '', fetchImpl: mockFetch}),
    ).rejects.toMatchObject({
      name: 'CoreUpstreamError',
      statusCode: 429,
      code: 'CORE_RATE_LIMITED',
      rateLimit: {
        limit: 10,
        remaining: 0,
        retryAfter: '2026-11-20T12:46:53+0000',
      },
    });
  });

  it('maps network errors to 502 UPSTREAM_NETWORK_ERROR', async () => {
    const failingFetch: typeof fetch = async () => {
      throw new TypeError('fetch failed');
    };

    let caught: unknown;
    try {
      await searchCoreWorks({q: 'drone', limit: 10, offset: 0}, {fetchImpl: failingFetch});
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(CoreUpstreamError);
    expect((caught as CoreUpstreamError).statusCode).toBe(502);
    expect((caught as CoreUpstreamError).code).toBe('UPSTREAM_NETWORK_ERROR');
  });
});
