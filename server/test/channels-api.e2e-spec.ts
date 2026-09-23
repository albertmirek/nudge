import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { Friend } from '../src/friends/entities/friend.entity.js';
import { Nudge } from '../src/nudges/entities/nudge.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { createTestApp, truncateAll } from './create-test-app.js';

interface ChannelResponse {
  id: string;
  type: string;
  handle: string;
  deepLink: string | null;
  link: string;
}
interface FriendResponse {
  id: string;
  lastContactAt: string | null;
  nudge: { id: string; revision: number; scheduledFor: string };
  channels: ChannelResponse[];
}

describe('Channels API (e2e)', () => {
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

  const http = () => request(app.getHttpServer());

  async function createFriend(): Promise<FriendResponse> {
    const response = await http()
      .post('/v1/friends')
      .send({ name: 'Alice', periodicity: 'MONTHLY' })
      .expect(201);
    return response.body as FriendResponse;
  }
  async function addChannel(friendId: string, body: object): Promise<ChannelResponse> {
    const response = await http().post(`/v1/friends/${friendId}/channels`).send(body).expect(201);
    return response.body as ChannelResponse;
  }

  it('creates a channel with a derived link and lists it on the friend', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'INSTAGRAM', handle: '@jan.novak' });
    expect(channel).toMatchObject({
      type: 'INSTAGRAM',
      handle: 'jan.novak',
      deepLink: null,
      link: 'https://ig.me/m/jan.novak',
    });
    const loaded = await http().get(`/v1/friends/${friend.id}`).expect(200);
    expect((loaded.body as FriendResponse).channels).toEqual([
      expect.objectContaining({ id: channel.id, link: 'https://ig.me/m/jan.novak' }),
    ]);
  });

  it('stores OTHER with its own link', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, {
      type: 'OTHER',
      handle: 'Discord',
      deepLink: 'https://discord.com/users/1',
    });
    expect(channel.link).toBe('https://discord.com/users/1');
  });

  it('validates bodies', async () => {
    const friend = await createFriend();
    const url = `/v1/friends/${friend.id}/channels`;
    await http().post(url).send({ type: 'WHATSAPP', handle: '777 123 456' }).expect(400);
    await http()
      .post(url)
      .send({ type: 'WHATSAPP', handle: '+420777123456', deepLink: 'https://wa.me/1' })
      .expect(400);
    await http().post(url).send({ type: 'OTHER', handle: 'Discord' }).expect(400);
    await http()
      .post(url)
      .send({ type: 'SMS', handle: '+420777123456', friendId: friend.id })
      .expect(400);
  });

  it('rejects a duplicate channel with 409', async () => {
    const friend = await createFriend();
    await addChannel(friend.id, { type: 'WHATSAPP', handle: '+420777123456' });
    await http()
      .post(`/v1/friends/${friend.id}/channels`)
      .send({ type: 'WHATSAPP', handle: '+420777123456' })
      .expect(409);
  });

  it('updates the handle (validated against the stored type) and deletes', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'TELEGRAM', handle: 'jan_novak' });
    const url = `/v1/friends/${friend.id}/channels/${channel.id}`;
    const updated = await http().patch(url).send({ handle: 'jan_novak2' }).expect(200);
    expect(updated.body).toMatchObject({ handle: 'jan_novak2', link: 'https://t.me/jan_novak2' });
    await http().patch(url).send({ handle: '+420777123456' }).expect(400);
    await http().patch(url).send({ type: 'SMS' }).expect(400);
    await http().patch(url).send({}).expect(400);
    await http().delete(url).expect(204);
    await http().delete(url).expect(404);
  });

  it('opening a channel records contact now and replans the nudge', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'WHATSAPP', handle: '+420777123456' });
    const before = Date.now();
    const response = await http()
      .post(`/v1/friends/${friend.id}/channels/${channel.id}/open`)
      .expect(200);
    const body = response.body as { lastContactAt: string; nudge: FriendResponse['nudge'] };
    expect(new Date(body.lastContactAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(body.nudge.id).toBe(friend.nudge.id);
    // Created and opened moments apart, so the replanned date can equal the original one;
    // the revision bump proves the replan happened.
    expect(body.nudge.revision).toBe(friend.nudge.revision + 1);
    const loaded = (await http().get(`/v1/friends/${friend.id}`).expect(200))
      .body as FriendResponse;
    expect(loaded.lastContactAt).toBe(body.lastContactAt);
  });

  it('opening works for a friend whose nudge row is missing', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'SMS', handle: '+420777123456' });
    await dataSource.getRepository(Nudge).delete({ friendId: friend.id });
    await http().post(`/v1/friends/${friend.id}/channels/${channel.id}/open`).expect(200);
    expect(await dataSource.getRepository(Nudge).countBy({ friendId: friend.id })).toBe(1);
  });

  it('hides other users and mismatched friend/channel pairs behind 404', async () => {
    const friend = await createFriend();
    const other = await createFriend();
    const channel = await addChannel(friend.id, { type: 'SMS', handle: '+420777123456' });
    await http().post(`/v1/friends/${other.id}/channels/${channel.id}/open`).expect(404);
    await http()
      .patch(`/v1/friends/${other.id}/channels/${channel.id}`)
      .send({ handle: '+420777000000' })
      .expect(404);

    userId = (await dataSource.getRepository(User).save({ timezone: 'Europe/Prague' })).id;
    await http().post(`/v1/friends/${friend.id}/channels/${channel.id}/open`).expect(404);
    await http()
      .post(`/v1/friends/${friend.id}/channels`)
      .send({ type: 'SMS', handle: '+420777000000' })
      .expect(404);
    expect(
      (await dataSource.getRepository(Friend).findOneByOrFail({ id: friend.id })).lastContactAt,
    ).toBeNull();
  });
});
