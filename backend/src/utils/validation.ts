import { z } from 'zod';

const httpUrlSchema = z
  .string({ required_error: 'originalUrl is required' })
  .trim()
  .min(1, 'originalUrl must not be empty')
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'originalUrl must be a valid HTTP/HTTPS URL' }
  );

export const shortenSchema = z.object({
  originalUrl: httpUrlSchema,
});

export const shortCodeParamSchema = z
  .string()
  .min(1)
  .max(10)
  .regex(/^[A-Za-z0-9]+$/, 'shortCode must be alphanumeric');
