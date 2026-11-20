import {Router, Request, Response} from 'express';
import {CoreServiceOptions, CoreUpstreamError, searchCoreWorks} from './core-api.service';
import {validateSearchParams} from './validation';

/**
 * Creates the Express router handling /api/core/* endpoints.
 * Accepts optional service options to support clean dependency injection in tests.
 */
export function createCoreRouter(serviceOptions: CoreServiceOptions = {}): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    const rawKey = serviceOptions.apiKey ?? process.env['CORE_API_KEY'] ?? '';
    const hasApiKey = Boolean(rawKey && rawKey !== 'YOUR_CORE_API_KEY' && rawKey.trim().length > 0);

    res.status(200).json({
      status: 'ok',
      provider: 'CORE API v3',
      apiKeyConfigured: hasApiKey,
    });
  });

  router.get('/search', async (req: Request, res: Response) => {
    const validation = validateSearchParams({
      q: req.query['q'],
      limit: req.query['limit'],
      offset: req.query['offset'],
    });

    if (!validation.valid || !validation.data) {
      res.status(400).json({
        code: validation.code ?? 'VALIDATION_ERROR',
        error: validation.error ?? 'Invalid search parameters.',
      });
      return;
    }

    try {
      const result = await searchCoreWorks(validation.data, serviceOptions);
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof CoreUpstreamError) {
        res.status(err.statusCode).json({
          code: err.code,
          error: err.message,
          rateLimit: err.rateLimit ?? null,
        });
        return;
      }

      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        error: 'An unexpected error occurred while searching CORE.',
      });
    }
  });

  return router;
}
