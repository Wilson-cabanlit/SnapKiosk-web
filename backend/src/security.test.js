import { describe, expect, it } from 'vitest';
import { digest, hashPassword, parseCookies, randomToken, verifyPassword } from './security.js';

describe('security utilities', () => {
  it('generates unpredictable-looking URL-safe hex tokens of the requested length', () => {
    const token = randomToken(24);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it('stores passwords as salted PBKDF2 hashes and verifies them', async () => {
    const stored = await hashPassword('a strong passphrase 123');
    expect(stored).toMatch(/^pbkdf2-sha256\$310000\$/);
    expect(await verifyPassword('a strong passphrase 123', stored)).toBe(true);
    expect(await verifyPassword('not the password', stored)).toBe(false);
  });

  it('hashes guest/session tokens before persistence', async () => {
    expect(await digest('secret-token')).toMatch(/^[0-9a-f]{64}$/);
    expect(await digest('secret-token')).not.toBe('secret-token');
  });

  it('parses cookies containing equals signs in their values', () => {
    expect(parseCookies('first=abc; snapkiosk_session=token%3Dvalue')).toEqual({ first:'abc',snapkiosk_session:'token=value' });
  });
});
