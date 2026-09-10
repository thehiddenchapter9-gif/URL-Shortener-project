import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny, z } from 'zod';
import { ValidationError } from '../utils/errors';


export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(firstIssueMessage(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParam<T extends ZodTypeAny>(paramName: string, schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params[paramName]);
    if (!result.success) {
      next(new ValidationError(firstIssueMessage(result.error)));
      return;
    }
    (req.params as Record<string, string>)[paramName] = result.data as unknown as string;
    next();
  };
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}
