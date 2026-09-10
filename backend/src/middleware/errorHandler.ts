import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';


export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { path: req.path, stack: err.stack });
    } else {
      logger.warn(err.message, { path: req.path, statusCode: err.statusCode });
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }


  const maybeHttpError = err as { status?: number; statusCode?: number; message?: string };
  const httpStatus = maybeHttpError.status ?? maybeHttpError.statusCode;

  if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
    logger.warn(maybeHttpError.message ?? 'Bad request', { path: req.path, statusCode: httpStatus });
    res.status(httpStatus).json({ error: maybeHttpError.message ?? 'Bad request' });
    return;
  }

  const error = err as Error;
  logger.error('Unhandled error', { path: req.path, message: error?.message, stack: error?.stack });
  res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
