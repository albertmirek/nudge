import { hashPassword, needsRehash, verifyPassword } from './password.js';

describe('password', () => {
  it('round-trips and salts', async () => {
    const a = await hashPassword('correct horse');
    const b = await hashPassword('correct horse');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    await expect(verifyPassword('correct horse', a)).resolves.toBe(true);
    await expect(verifyPassword('wrong', a)).resolves.toBe(false);
  });

  it('rejects malformed or tampered hashes without throwing', async () => {
    await expect(verifyPassword('x', 'garbage')).resolves.toBe(false);
    const hash = await hashPassword('x');
    const tampered = hash.slice(0, -2) + 'AA';
    await expect(verifyPassword('x', tampered)).resolves.toBe(false);
  });

  it('flags hashes made with weaker parameters', async () => {
    const hash = await hashPassword('x');
    expect(needsRehash(hash)).toBe(false);
    expect(needsRehash(hash.replace('scrypt$32768', 'scrypt$16384'))).toBe(true);
    expect(needsRehash('garbage')).toBe(true);
  });
});
