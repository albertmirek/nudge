import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource, QueryFailedError } from 'typeorm';
import { CatchUp } from '../src/friends/entities/catch-up.entity.js';
import { Friend } from '../src/friends/entities/friend.entity.js';
import { FriendPeriodicity } from '../src/friends/entities/friend-periodicity.enum.js';
import { Nudge } from '../src/nudges/entities/nudge.entity.js';
import { NudgeStatus } from '../src/nudges/entities/nudge-status.enum.js';
import { NudgeSchedulingService } from '../src/nudges/nudge-scheduling.service.js';
import { User } from '../src/users/entities/user.entity.js';
import { createTestApp, truncateAll } from './create-test-app.js';

interface NudgeResponse {
  id: string;
  revision: number;
  status: NudgeStatus;
  scheduledFor: string;
  lastEditedAt: string;
}
interface FriendResponse {
  id: string;
  name: string;
  lastContactAt: string | null;
  nudge: NudgeResponse;
}
interface CatchUpResponse {
  id: string;
  note: string | null;
  createdAt: string;
}

describe('Friends, catch-ups and nudges API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userId: string | undefined;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp(() => userId));
  });
  beforeEach(async () => {
    await truncateAll(dataSource);
    userId = (await dataSource.getRepository(User).save({ timezone: 'Europe/Prague' })).id;
  });
  afterAll(async () => {
    await app.close();
  });

  async function createFriend(): Promise<FriendResponse> {
    const response = await request(app.getHttpServer())
      .post('/v1/friends')
      .send({ name: 'Alice', periodicity: 'MONTHLY' })
      .expect(201);
    return response.body as FriendResponse;
  }
  async function getFriend(id: string): Promise<FriendResponse> {
    const response = await request(app.getHttpServer()).get(`/v1/friends/${id}`).expect(200);
    return response.body as FriendResponse;
  }
  async function catchUp(friendId: string): Promise<CatchUpResponse> {
    const response = await request(app.getHttpServer())
      .post(`/v1/friends/${friendId}/catch-up`)
      .send({ note: 'Coffee' })
      .expect(201);
    return response.body as CatchUpResponse;
  }

  it('requires trusted authentication, ignoring client-supplied identity', async () => {
    const existingUser = userId!;
    userId = undefined;
    await request(app.getHttpServer())
      .get('/v1/friends')
      .set('x-user-id', existingUser)
      .expect(401);
    await request(app.getHttpServer())
      .post('/v1/friends')
      .send({ userId: existingUser })
      .expect(401);
  });

  it('creates, reads, updates and deletes a friend and its single nudge', async () => {
    const friend = await createFriend();
    expect(friend.nudge).toMatchObject({ revision: 1, status: 'PLANNED' });
    const listed = await request(app.getHttpServer()).get('/v1/friends').expect(200);
    expect(listed.body).toEqual([expect.objectContaining({ id: friend.id })]);
    await request(app.getHttpServer())
      .patch(`/v1/friends/${friend.id}`)
      .send({ name: 'Alicia' })
      .expect(200);
    expect((await getFriend(friend.id)).name).toBe('Alicia');
    expect((await getFriend(friend.id)).nudge.revision).toBe(1);
    await catchUp(friend.id);
    await request(app.getHttpServer()).delete(`/v1/friends/${friend.id}`).expect(204);
    expect(await dataSource.getRepository(Nudge).count()).toBe(0);
    expect(await dataSource.getRepository(CatchUp).count()).toBe(0);
    await request(app.getHttpServer()).get(`/v1/friends/${friend.id}`).expect(404);
  });

  it.each([
    { name: '', periodicity: 'MONTHLY' },
    { name: 'Alice', periodicity: 'DAILY' },
    { name: 'Alice', periodicity: 'WEEKLY', nudgeEnabled: 'false' },
    { name: 'Alice', periodicity: 'MONTHLY', userId: 'spoofed' },
    { name: 'Alice', periodicity: null },
  ])('rejects invalid friend input: %j', async (body) => {
    await request(app.getHttpServer()).post('/v1/friends').send(body).expect(400);
    expect(await dataSource.getRepository(Friend).count()).toBe(0);
  });

  it('rejects malformed IDs, empty updates and protected fields', async () => {
    const friend = await createFriend();
    await request(app.getHttpServer()).get('/v1/friends/invalid').expect(400);
    for (const body of [{}, { name: null }, { lastContactAt: new Date().toISOString() }]) {
      await request(app.getHttpServer()).patch(`/v1/friends/${friend.id}`).send(body).expect(400);
    }
    await request(app.getHttpServer())
      .post(`/v1/nudges/${friend.nudge.id}/snooze`)
      .send({})
      .expect(400);
  });

  it('hides another user’s friends, catch-ups and nudges for every operation', async () => {
    const friend = await createFriend();
    const contact = await catchUp(friend.id);
    userId = (await dataSource.getRepository(User).save({ timezone: 'UTC' })).id;
    expect((await request(app.getHttpServer()).get('/v1/friends').expect(200)).body).toEqual([]);
    const friendUrl = `/v1/friends/${friend.id}`;
    const contactUrl = `${friendUrl}/catch-up`;
    await request(app.getHttpServer()).get(friendUrl).expect(404);
    await request(app.getHttpServer()).patch(friendUrl).send({ name: 'Hijack' }).expect(404);
    await request(app.getHttpServer()).delete(friendUrl).expect(404);
    await request(app.getHttpServer()).post(contactUrl).send({}).expect(404);
    await request(app.getHttpServer()).get(contactUrl).expect(404);
    await request(app.getHttpServer()).get(`${contactUrl}/${contact.id}`).expect(404);
    await request(app.getHttpServer())
      .patch(`${contactUrl}/${contact.id}`)
      .send({ note: 'Hijack' })
      .expect(404);
    await request(app.getHttpServer()).delete(`${contactUrl}/${contact.id}`).expect(404);
    for (const action of ['snooze', 'confirm']) {
      await request(app.getHttpServer())
        .post(`/v1/nudges/${friend.nudge.id}/${action}`)
        .send({ revision: 2 })
        .expect(404);
    }
  });

  it('provides catch-up CRUD and restores the previous contact when deleting the latest', async () => {
    const friend = await createFriend();
    const first = await catchUp(friend.id);
    const second = await catchUp(friend.id);
    const url = `/v1/friends/${friend.id}/catch-up`;
    expect((await request(app.getHttpServer()).get(url).expect(200)).body).toHaveLength(2);
    await request(app.getHttpServer())
      .patch(`${url}/${second.id}`)
      .send({ note: 'Updated' })
      .expect(200);
    expect(
      (await request(app.getHttpServer()).get(`${url}/${second.id}`).expect(200)).body,
    ).toMatchObject({ note: 'Updated' });
    expect((await getFriend(friend.id)).nudge.revision).toBe(3);
    await request(app.getHttpServer()).delete(`${url}/${second.id}`).expect(204);
    expect((await getFriend(friend.id)).lastContactAt).toBe(first.createdAt);
    await request(app.getHttpServer()).delete(`${url}/${first.id}`).expect(204);
    const reloaded = await getFriend(friend.id);
    expect(reloaded.lastContactAt).toBeNull();
    expect(reloaded.nudge.id).toBe(friend.nudge.id);
    expect(reloaded.nudge.scheduledFor).toBe(friend.nudge.scheduledFor);
  });

  it('prevents catch-up access through a different friend URL', async () => {
    const first = await createFriend();
    const second = await createFriend();
    const contact = await catchUp(first.id);
    const url = `/v1/friends/${second.id}/catch-up/${contact.id}`;
    await request(app.getHttpServer()).get(url).expect(404);
    await request(app.getHttpServer()).patch(url).send({ note: null }).expect(404);
    await request(app.getHttpServer()).delete(url).expect(404);
  });

  it('snoozes by exactly 24 hours and rejects a retried stale action', async () => {
    const friend = await createFriend();
    const url = `/v1/nudges/${friend.nudge.id}/snooze`;
    const response = await request(app.getHttpServer()).post(url).send({ revision: 1 }).expect(200);
    const nudge = response.body as NudgeResponse;
    expect(nudge.id).toBe(friend.nudge.id);
    expect(nudge.status).toBe('SNOOZED');
    expect(nudge.revision).toBe(2);
    expect(Date.parse(nudge.scheduledFor) - Date.parse(friend.nudge.scheduledFor)).toBe(86400000);
    expect(Date.parse(nudge.lastEditedAt)).toBeGreaterThanOrEqual(
      Date.parse(friend.nudge.lastEditedAt),
    );
    await request(app.getHttpServer()).post(url).send({ revision: 1 }).expect(409);
    expect(await dataSource.getRepository(CatchUp).count()).toBe(0);
  });

  it('confirms once, recording contact and scheduling from that contact', async () => {
    const friend = await createFriend();
    await request(app.getHttpServer())
      .post(`/v1/nudges/${friend.nudge.id}/snooze`)
      .send({ revision: 1 })
      .expect(200);
    const url = `/v1/nudges/${friend.nudge.id}/confirm`;
    const results = await Promise.all([
      request(app.getHttpServer()).post(url).send({ revision: 2 }),
      request(app.getHttpServer()).post(url).send({ revision: 2 }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const contacts = await dataSource.getRepository(CatchUp).findBy({ friendId: friend.id });
    expect(contacts).toHaveLength(1);
    const reloaded = await getFriend(friend.id);
    expect(reloaded.lastContactAt).toBe(contacts[0]!.createdAt.toISOString());
    expect(reloaded.nudge).toMatchObject({ id: friend.nudge.id, status: 'PLANNED', revision: 3 });
    expect(Date.parse(reloaded.nudge.scheduledFor)).toBeGreaterThan(
      Date.parse(reloaded.lastContactAt!),
    );
  });

  it('serializes competing confirm and snooze requests', async () => {
    const friend = await createFriend();
    const results = await Promise.all(
      ['confirm', 'snooze'].map((action) =>
        request(app.getHttpServer())
          .post(`/v1/nudges/${friend.nudge.id}/${action}`)
          .send({ revision: 1 }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await getFriend(friend.id)).nudge.revision).toBe(2);
  });

  it('preserves a snooze when editing or deleting an older catch-up', async () => {
    const friend = await createFriend();
    const older = await catchUp(friend.id);
    await catchUp(friend.id);
    await request(app.getHttpServer())
      .post(`/v1/nudges/${friend.nudge.id}/snooze`)
      .send({ revision: 3 })
      .expect(200);
    const before = (await getFriend(friend.id)).nudge;
    await request(app.getHttpServer())
      .delete(`/v1/friends/${friend.id}/catch-up/${older.id}`)
      .expect(204);
    expect((await getFriend(friend.id)).nudge).toEqual(before);
  });

  it('replans for periodicity changes and invalidates jobs when disabling nudges', async () => {
    const friend = await createFriend();
    await request(app.getHttpServer())
      .patch(`/v1/friends/${friend.id}`)
      .send({ periodicity: 'WEEKLY' })
      .expect(200);
    const weekly = (await getFriend(friend.id)).nudge;
    expect(weekly.revision).toBe(2);
    expect(weekly.scheduledFor).not.toBe(friend.nudge.scheduledFor);
    await request(app.getHttpServer())
      .patch(`/v1/friends/${friend.id}`)
      .send({ nudgeEnabled: false })
      .expect(200);
    const disabled = (await getFriend(friend.id)).nudge;
    expect(disabled.revision).toBe(3);
    expect(disabled.scheduledFor).toBe(weekly.scheduledFor);
  });

  it('enforces one nudge per friend at the database level', async () => {
    const friend = await createFriend();
    await expect(
      dataSource
        .getRepository(Nudge)
        .insert({ friendId: friend.id, userId, scheduledFor: new Date() }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it.each([
    ['2026-01-31T12:00:00Z', FriendPeriodicity.MONTHLY, '2026-02-28T17:00:00Z'],
    ['2028-01-31T12:00:00Z', FriendPeriodicity.MONTHLY, '2028-02-29T17:00:00Z'],
    ['2026-01-31T12:00:00Z', FriendPeriodicity.QUARTERLY, '2026-04-30T16:00:00Z'],
    ['2026-03-22T12:00:00Z', FriendPeriodicity.WEEKLY, '2026-03-29T16:00:00Z'],
    ['2026-10-11T12:00:00Z', FriendPeriodicity.BIWEEKLY, '2026-10-25T17:00:00Z'],
  ])(
    'schedules calendar periods and local reminder time: %s %s',
    async (contactAt, periodicity, expected) => {
      const response = await createFriend();
      const scheduled = await dataSource.transaction(async (manager) => {
        const friend = await manager.findOneOrFail(Friend, {
          where: { id: response.id },
          lock: { mode: 'pessimistic_write' },
        });
        friend.lastContactAt = new Date(contactAt);
        friend.periodicity = periodicity;
        return app.get(NudgeSchedulingService).plan(manager, friend);
      });
      expect(scheduled.scheduledFor.toISOString()).toBe(new Date(expected).toISOString());
    },
  );

  it('rolls back contact creation if rescheduling fails', async () => {
    const friend = await createFriend();
    const scheduling = app.get(NudgeSchedulingService);
    const spy = vi
      .spyOn(scheduling, 'plan')
      .mockRejectedValueOnce(new Error('Scheduling unavailable'));
    try {
      await request(app.getHttpServer())
        .post(`/v1/nudges/${friend.nudge.id}/confirm`)
        .send({ revision: 1 })
        .expect(500);
      expect(await dataSource.getRepository(CatchUp).count()).toBe(0);
      expect((await getFriend(friend.id)).lastContactAt).toBeNull();
      expect((await getFriend(friend.id)).nudge.revision).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('keeps migrations in sync with entity metadata', async () => {
    const diff = await dataSource.driver.createSchemaBuilder().log();
    expect(diff.upQueries.map((query) => query.query)).toEqual([]);
  });
});
