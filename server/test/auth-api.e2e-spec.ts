import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource, IsNull } from 'typeorm';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { FakeEmailService, createTestApp, truncateAll } from './create-test-app.js';

type Session = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: { id: string; email: string };
};

type ErrorBody = { message: string };

const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse battery';

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const email = new FakeEmailService();
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp(undefined, email));
  });
  beforeEach(async () => {
    await truncateAll(dataSource);
    email.sent = [];
  });
  afterAll(() => app.close());

  async function signUpAndVerify(): Promise<Session> {
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'Europe/Prague' })
      .expect(201);
    const response = await http()
      .post('/v1/auth/verify-email')
      .send({ email: EMAIL, code: email.lastCodeFor(EMAIL) })
      .expect(200);
    return response.body as Session;
  }

  it('signs up, verifies and can call an authenticated route', async () => {
    const session = await signUpAndVerify();
    expect(session.user).toMatchObject({ email: EMAIL });
    expect(session.user).not.toHaveProperty('passwordHash');
    expect(email.sent[0]?.subject).toBe('Verify your Nudge email');
    await http()
      .get('/v1/users/me')
      .set('authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    const user = await dataSource.getRepository(User).findOneByOrFail({ email: EMAIL });
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  it('refuses sign-in until verified, and resends a code', async () => {
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'UTC' })
      .expect(201);
    const response = await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(403);
    expect(response.body).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    expect(email.sent).toHaveLength(2);
    await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: 'wrong password' })
      .expect(401);
  });

  it('lets an unverified sign-up retry with a new password, but rejects a verified duplicate', async () => {
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'UTC' })
      .expect(201);
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: 'another one!', timezone: 'UTC' })
      .expect(201);
    await http()
      .post('/v1/auth/verify-email')
      .send({ email: EMAIL, code: email.lastCodeFor(EMAIL) })
      .expect(200);
    await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: 'another one!' })
      .expect(200);
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'UTC' })
      .expect(409);
  });

  it('uses the same message for unknown email and wrong password', async () => {
    await signUpAndVerify();
    const wrong = await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: 'nope nope nope' })
      .expect(401);
    const unknown = await http()
      .post('/v1/auth/sign-in')
      .send({ email: 'ghost@example.com', password: PASSWORD })
      .expect(401);
    expect((wrong.body as ErrorBody).message).toBe('Wrong email or password');
    expect((unknown.body as ErrorBody).message).toBe((wrong.body as ErrorBody).message);
  });

  it('rejects a bad code, an old code, and a code after five wrong attempts', async () => {
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'UTC' })
      .expect(201);
    const first = email.lastCodeFor(EMAIL);
    await http().post('/v1/auth/resend-verification').send({ email: EMAIL }).expect(204);
    await http().post('/v1/auth/verify-email').send({ email: EMAIL, code: first }).expect(400);
    const second = email.lastCodeFor(EMAIL);
    const wrong = second === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await http().post('/v1/auth/verify-email').send({ email: EMAIL, code: wrong }).expect(400);
    }
    const exhausted = await http()
      .post('/v1/auth/verify-email')
      .send({ email: EMAIL, code: second })
      .expect(400);
    expect((exhausted.body as ErrorBody).message).toBe('Invalid or expired code');
  });

  it('is silent about unknown emails on resend and forgot', async () => {
    await http()
      .post('/v1/auth/resend-verification')
      .send({ email: 'ghost@example.com' })
      .expect(204);
    await http().post('/v1/auth/forgot-password').send({ email: 'ghost@example.com' }).expect(204);
    expect(email.sent).toHaveLength(0);
  });

  it('rotates refresh tokens and revokes every session when an old one is replayed', async () => {
    const session = await signUpAndVerify();
    const rotated = (
      await http().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(200)
    ).body as Session;
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    // Replaying the consumed token is treated as theft.
    await http().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken: rotated.refreshToken }).expect(401);
    const rows = await dataSource.getRepository(RefreshToken).find();
    expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('keeps the session start on rotation and slides the idle deadline', async () => {
    const session = await signUpAndVerify();
    const before = (await dataSource.getRepository(RefreshToken).find())[0]!;
    await dataSource
      .getRepository(RefreshToken)
      .update({ id: before.id }, { createdAt: new Date('2026-01-01T00:00:00Z') });
    await http().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(200);
    const after = (
      await dataSource
        .getRepository(RefreshToken)
        .find({ where: { revokedAt: IsNull() }, order: { expiresAt: 'DESC' } })
    )[0]!;
    expect(after.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    const idleDays = (after.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(idleDays).toBeGreaterThan(179);
    expect(idleDays).toBeLessThanOrEqual(180);
  });

  it('rejects expired and capped refresh tokens', async () => {
    const session = await signUpAndVerify();
    const repo = dataSource.getRepository(RefreshToken);
    const row = (await repo.find())[0]!;
    await repo.update({ id: row.id }, { expiresAt: new Date(Date.now() - 1000) });
    await http().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    const fresh = await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(200);
    const capped = (await repo.find({ order: { expiresAt: 'DESC' } }))[0]!;
    await repo.update({ id: capped.id }, { createdAt: new Date(Date.now() - 731 * 86_400_000) });
    await http()
      .post('/v1/auth/refresh')
      .send({ refreshToken: (fresh.body as Session).refreshToken })
      .expect(401);
  });

  it('signs out one device only', async () => {
    const a = await signUpAndVerify();
    const b = (
      await http().post('/v1/auth/sign-in').send({ email: EMAIL, password: PASSWORD }).expect(200)
    ).body as Session;
    await http().post('/v1/auth/sign-out').send({ refreshToken: a.refreshToken }).expect(204);
    await http().post('/v1/auth/refresh').send({ refreshToken: a.refreshToken }).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken: b.refreshToken }).expect(200);
    await http().post('/v1/auth/sign-out').send({ refreshToken: 'unknown' }).expect(204);
  });

  it('resets the password, signs in, and kills existing sessions', async () => {
    const old = await signUpAndVerify();
    await http().post('/v1/auth/forgot-password').send({ email: EMAIL }).expect(204);
    expect(email.sent.at(-1)?.subject).toBe('Reset your Nudge password');
    const reset = (
      await http()
        .post('/v1/auth/reset-password')
        .send({ email: EMAIL, code: email.lastCodeFor(EMAIL), newPassword: 'brand new password' })
        .expect(200)
    ).body as Session;
    await http()
      .get('/v1/users/me')
      .set('authorization', `Bearer ${reset.accessToken}`)
      .expect(200);
    await http().post('/v1/auth/refresh').send({ refreshToken: old.refreshToken }).expect(401);
    await http().post('/v1/auth/sign-in').send({ email: EMAIL, password: PASSWORD }).expect(401);
    await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: 'brand new password' })
      .expect(200);
  });

  it('marks an unverified account verified on password reset', async () => {
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'UTC' })
      .expect(201);
    await http().post('/v1/auth/forgot-password').send({ email: EMAIL }).expect(204);
    await http()
      .post('/v1/auth/reset-password')
      .send({ email: EMAIL, code: email.lastCodeFor(EMAIL), newPassword: 'brand new password' })
      .expect(200);
    await http()
      .post('/v1/auth/sign-in')
      .send({ email: EMAIL, password: 'brand new password' })
      .expect(200);
  });

  it('validates bodies', async () => {
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: 'nope', password: PASSWORD, timezone: 'UTC' })
      .expect(400);
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: 'short', timezone: 'UTC' })
      .expect(400);
    await http()
      .post('/v1/auth/sign-up')
      .send({ email: EMAIL, password: PASSWORD, timezone: 'Nowhere/City' })
      .expect(400);
    await http().post('/v1/auth/verify-email').send({ email: EMAIL, code: '12' }).expect(400);
    await http().post('/v1/auth/refresh').send({}).expect(400);
  });
});
