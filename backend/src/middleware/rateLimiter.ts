import rateLimit from 'express-rate-limit';
import { env } from '../config/env';


export function createShortenRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: env.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
}
