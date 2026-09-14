import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const query = vi.fn();

  async function build() {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: { query } }],
    }).compile();
    return moduleRef.get(HealthController);
  }

  beforeEach(() => {
    query.mockReset();
  });

  it('returns ok when the database answers', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);
    const controller = await build();

    await expect(controller.check()).resolves.toEqual({ status: 'ok', db: 'ok' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 when the database query fails', async () => {
    query.mockRejectedValue(new Error('connection refused'));
    const controller = await build();

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
