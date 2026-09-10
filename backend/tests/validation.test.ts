import { shortCodeParamSchema, shortenSchema } from '../src/utils/validation';

describe('shortenSchema', () => {
  it('accepts a valid https URL', () => {
    const result = shortenSchema.safeParse({ originalUrl: 'https://example.com/path' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid http URL', () => {
    const result = shortenSchema.safeParse({ originalUrl: 'http://example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-http(s) protocol', () => {
    const result = shortenSchema.safeParse({ originalUrl: 'ftp://example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed URL', () => {
    const result = shortenSchema.safeParse({ originalUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = shortenSchema.safeParse({ originalUrl: '' });
    expect(result.success).toBe(false);
  });
});

describe('shortCodeParamSchema', () => {
  it('accepts an alphanumeric code', () => {
    expect(shortCodeParamSchema.safeParse('abc123').success).toBe(true);
  });

  it('rejects codes with special characters', () => {
    expect(shortCodeParamSchema.safeParse('abc-123').success).toBe(false);
  });
});
