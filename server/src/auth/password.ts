import { randomBytes, scrypt as scryptCallback, timingSafeEqual, ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as unknown as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer>;

// OWASP-recommended scrypt parameters; bump N here and needsRehash() upgrades old hashes lazily.
const PARAMS = { N: 32768, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

type Parsed = { N: number; r: number; p: number; salt: Buffer; key: Buffer };

function parse(hash: string): Parsed | null {
  const parts = hash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [, n, r, p, salt, key] = parts as [string, string, string, string, string, string];
  const parsed = { N: Number(n), r: Number(r), p: Number(p) };
  if (![parsed.N, parsed.r, parsed.p].every(Number.isSafeInteger)) return null;
  return { ...parsed, salt: Buffer.from(salt, 'base64'), key: Buffer.from(key, 'base64') };
}

async function derive(password: string, salt: Buffer, params: typeof PARAMS): Promise<Buffer> {
  return await scrypt(password, salt, KEY_LENGTH, {
    ...params,
    maxmem: 128 * params.N * params.r * 2,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parsed = parse(hash);
  if (!parsed || parsed.key.length !== KEY_LENGTH) return false;
  try {
    const key = await derive(password, parsed.salt, parsed);
    return timingSafeEqual(key, parsed.key);
  } catch {
    return false;
  }
}

/** True when the hash was made with parameters weaker than PARAMS (or is unreadable). */
export function needsRehash(hash: string): boolean {
  const parsed = parse(hash);
  return !parsed || parsed.N < PARAMS.N || parsed.r < PARAMS.r || parsed.p < PARAMS.p;
}
