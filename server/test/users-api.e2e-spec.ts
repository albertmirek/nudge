import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { signAccessToken } from '../src/auth/access-token.js';
import { AUTH_CONFIG } from '../src/auth/auth-config.js';
import type { AuthConfig } from '../src/auth/auth-config.js';
import { createTestApp, createUser, truncateAll } from './create-test-app.js';

interface UserResponse {
  id: string;
  name: string;
  timezone: string;
  preferredReminderLocalTime: string;
  nudgeEnabled: boolean;
}

describe('Users API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userId: string | undefined;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp(() => userId));
  });
  beforeEach(async () => {
    await truncateAll(dataSource);
    userId = undefined;
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns the current user', async () => {
    userId = (await createUser(dataSource, { name: 'Sandra' })).id;
    const response = await request(app.getHttpServer()).get('/v1/users/me').expect(200);
    expect(response.body as UserResponse).toMatchObject({
      id: userId,
      name: 'Sandra',
      timezone: 'Europe/Prague',
      nudgeEnabled: true,
    });
  });

  it('requires trusted authentication', async () => {
    await request(app.getHttpServer()).get('/v1/users/me').expect(401);
  });

  it('returns 404 when the authenticated user has no record', async () => {
    userId = '00000000-0000-0000-0000-000000000099';
    await request(app.getHttpServer()).get('/v1/users/me').expect(404);
  });

  it('does not accept identity from the x-user-id header', async () => {
    const user = await createUser(dataSource);
    await request(app.getHttpServer()).get('/v1/users/me').set('x-user-id', user.id).expect(401);
  });

  it('accepts a bearer access token', async () => {
    const user = await createUser(dataSource);
    const token = await signAccessToken(app.get<AuthConfig>(AUTH_CONFIG), user.id);
    const response = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toMatchObject({ id: user.id, email: user.email });
    expect(response.body).not.toHaveProperty('passwordHash');
  });
});
