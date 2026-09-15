/// <reference types="jest" />

import { ApiError, apiFetch } from '@/api/http';

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends the dev user id header and parses a JSON response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'abc' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiFetch<{ id: string }>('/v1/users/me');

    expect(result).toEqual({ id: 'abc' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/v1\/users\/me$/);
    expect((init.headers as Record<string, string>)['x-user-id']).toBeTruthy();
  });

  it('throws ApiError with the status on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' }),
    }) as unknown as typeof fetch;

    await expect(apiFetch('/v1/users/me')).rejects.toMatchObject({
      status: 404,
      name: 'ApiError',
    });
    await expect(apiFetch('/v1/users/me')).rejects.toBeInstanceOf(ApiError);
  });
});
