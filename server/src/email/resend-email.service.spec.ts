import { ResendEmailService } from './resend-email.service.js';

describe('ResendEmailService', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('posts the message to Resend with the API key', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
    const service = new ResendEmailService('re_key', 'Nudge <no-reply@nudge.app>');
    await service.send({ to: 'a@example.com', subject: 'Hi', text: 'Body' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_key');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Nudge <no-reply@nudge.app>',
      to: ['a@example.com'],
      subject: 'Hi',
      text: 'Body',
    });
  });

  it('throws on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: () => Promise.resolve('bad') });
    const service = new ResendEmailService('re_key', 'Nudge <no-reply@nudge.app>');
    await expect(
      service.send({ to: 'a@example.com', subject: 'Hi', text: 'Body' }),
    ).rejects.toThrow(/Resend responded 422/);
  });
});
