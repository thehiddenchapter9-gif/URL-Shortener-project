import { Router } from 'express';
import { UrlController } from '../controllers/urlController';
import { validateBody, validateParam } from '../middleware/validate';
import { shortCodeParamSchema, shortenSchema } from '../utils/validation';
import { createShortenRateLimiter } from '../middleware/rateLimiter';

/** Routes mounted under `/api`. */
export function createApiRouter(controller: UrlController): Router {
  const router = Router();

  router.post(
    '/shorten',
    createShortenRateLimiter(),
    validateBody(shortenSchema),
    controller.shorten
  );
  router.get('/stats/:shortCode', validateParam('shortCode', shortCodeParamSchema), controller.stats);

  return router;
}

/** Root-level redirect route: `GET /:shortCode`. Mounted last, at `/`. */
export function createRedirectRouter(controller: UrlController): Router {
  const router = Router();

  router.get('/:shortCode', validateParam('shortCode', shortCodeParamSchema), controller.redirect);

  return router;
}
