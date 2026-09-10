import { Request, Response } from 'express';
import { z } from 'zod';
import { validateBody, validateParam } from '../src/middleware/validate';
import { ValidationError } from '../src/utils/errors';

function mockNext() {
  return jest.fn();
}

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('calls next() with no error and replaces req.body on success', () => {
    const req = { body: { name: 'Ada' } } as Request;
    const next = mockNext();

    validateBody(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Ada' });
  });

  it('calls next(ValidationError) on invalid input', () => {
    const req = { body: { name: '' } } as Request;
    const next = mockNext();

    validateBody(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(ValidationError);
  });
});

describe('validateParam', () => {
  const schema = z.string().regex(/^[a-z]+$/);

  it('passes through a valid param', () => {
    const req = { params: { code: 'abc' } } as unknown as Request;
    const next = mockNext();

    validateParam('code', schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params.code).toBe('abc');
  });

  it('rejects an invalid param', () => {
    const req = { params: { code: 'ABC-123' } } as unknown as Request;
    const next = mockNext();

    validateParam('code', schema)(req, {} as Response, next);

    const errorArg = next.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(ValidationError);
  });
});
