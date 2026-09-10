import { customAlphabet } from 'nanoid';

// Latin letters (upper + lower) and digits, as required by the spec.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function createShortCodeGenerator(length: number): () => string {
  return customAlphabet(ALPHABET, length);
}
