import express from 'express';
import {AddressInfo} from 'node:net';
import {createCoreRouter} from './core.routes';

describe('server/core.routes', () => {
  async function withTestServer(
    router: express.Router,
    run: (baseUrl: string) => Promise<void>,
  ): Promise<void> {
    const app = express();
    app.use('/api/core', router);

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });

    try {
      const address = server.address() as AddressInfo;
      await run(`http://127.0.0.1:${address.port}`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  }

  it('responds with health metadata without exposing API key secrets', async () => {
    const router = createCoreRouter({apiKey: 'secret-key-value'});

    await withTestServer(router, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/core/health`);
      const body = (await response.json()) as {
        status: string;
        provider: string;
        apiKeyConfigured: boolean;
      };

      expect(response.status).toBe(200);
      expect(body).toEqual({
        status: 'ok',
        provider: 'CORE API v3',
        apiKeyConfigured: true,
      });
      expect(JSON.stringify(body)).not.toContain('secret-key-value');
    });
  });

  it('returns HTTP 400 for malformed Boolean queries or invalid limits', async () => {
    const router = createCoreRouter({apiKey: ''});

    await withTestServer(router, async (baseUrl) => {
      const badBoolean = await fetch(`${baseUrl}/api/core/search?q=(drone%20AND`);
      expect(badBoolean.status).toBe(400);
      const badBooleanBody = (await badBoolean.json()) as {code: string};
      expect(badBooleanBody.code).toBe('INVALID_BOOLEAN_QUERY');

      const badLimit = await fetch(`${baseUrl}/api/core/search?q=drone&limit=500`);
      expect(badLimit.status).toBe(400);
      const badLimitBody = (await badLimit.json()) as {code: string};
      expect(badLimitBody.code).toBe('INVALID_LIMIT');
    });
  });

  it('proxies valid Boolean search requests and returns normalized JSON', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          totalHits: 12,
          limit: 10,
          offset: 0,
          results: [{id: 7, title: 'Autonomous Delivery Paper', yearPublished: 2025}],
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      );

    const router = createCoreRouter({apiKey: 'test-key', fetchImpl: mockFetch});

    await withTestServer(router, async (baseUrl) => {
      const res = await fetch(
        `${baseUrl}/api/core/search?q=${encodeURIComponent('(drone AND (package OR delivery))')}&limit=10`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        query: string;
        totalHits: number;
        results: {title: string}[];
      };
      expect(body.query).toBe('(drone AND (package OR delivery))');
      expect(body.totalHits).toBe(12);
      expect(body.results[0].title).toBe('Autonomous Delivery Paper');
    });
  });
});
