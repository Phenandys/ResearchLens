import http from 'node:http';
import {AddressInfo} from 'node:net';
import healthHandler from '../../api/core/health';
import searchHandler from '../../api/core/search';

describe('Vercel serverless functions (api/core/*)', () => {
  async function withHandlerServer(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>,
    run: (baseUrl: string) => Promise<void>,
  ): Promise<void> {
    const server = http.createServer((req, res) => {
      void handler(req, res);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
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

  it('api/core/health returns 200 JSON without exposing secrets', async () => {
    await withHandlerServer(healthHandler, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/core/health`);
      const body = (await res.json()) as {
        status: string;
        provider: string;
        apiKeyConfigured: boolean;
      };
      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.provider).toBe('CORE API v3');
      expect(typeof body.apiKeyConfigured).toBe('boolean');
    });
  });

  it('api/core/search validates query params and rejects invalid Boolean queries with 400', async () => {
    await withHandlerServer(searchHandler, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/core/search?q=(drone%20AND`);
      const body = (await res.json()) as {code: string; error: string};
      expect(res.status).toBe(400);
      expect(body.code).toBe('INVALID_BOOLEAN_QUERY');
    });
  });

  it('api/core/search rejects non-GET methods with 405', async () => {
    await withHandlerServer(searchHandler, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/core/search?q=drone`, {method: 'POST'});
      const body = (await res.json()) as {code: string};
      expect(res.status).toBe(405);
      expect(body.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
