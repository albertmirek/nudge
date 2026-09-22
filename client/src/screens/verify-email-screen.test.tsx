import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/http';
import { useSession } from '@/auth/session';
import { ThemeProvider } from '@/theme';

import { VerifyEmailScreen } from './verify-email-screen';

jest.mock('@/api/auth');
jest.mock('@/auth/session');

const session = { status: 'signedOut' as const, signIn: jest.fn(), signOut: jest.fn() };
const SESSION = {
  accessToken: 'a',
  accessTokenExpiresAt: '2026-09-21T10:15:00Z',
  refreshToken: 'r',
  user: { id: 'u1' },
};

function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider initialMode="light">{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue(session);
  session.signIn.mockClear();
});

const user = () => userEvent.setup();

it('shows the email in the subtitle', async () => {
  await renderScreen(<VerifyEmailScreen email="ada@example.com" />);
  expect(screen.getByText('We sent a 6-digit code to ada@example.com.')).toBeOnTheScreen();
});

it('validates before submitting', async () => {
  await renderScreen(<VerifyEmailScreen email="ada@example.com" />);
  await user().press(screen.getByRole('button', { name: 'Verify' }));
  expect(screen.getByText('Enter the 6-digit code')).toBeOnTheScreen();
  expect(authApi.verifyEmail).not.toHaveBeenCalled();
});

it('verifies the code and hands the session over', async () => {
  jest.mocked(authApi.verifyEmail).mockResolvedValue(SESSION as never);
  await renderScreen(<VerifyEmailScreen email="ada@example.com" />);
  await user().type(screen.getByLabelText('Code'), '123456');
  await user().press(screen.getByRole('button', { name: 'Verify' }));
  await waitFor(() => expect(session.signIn).toHaveBeenCalledWith(SESSION));
  expect(authApi.verifyEmail).toHaveBeenCalledWith({ email: 'ada@example.com', code: '123456' });
});

it('shows the server message on 400', async () => {
  jest.mocked(authApi.verifyEmail).mockRejectedValue(new ApiError(400, 'Invalid or expired code'));
  await renderScreen(<VerifyEmailScreen email="ada@example.com" />);
  await user().type(screen.getByLabelText('Code'), '123456');
  await user().press(screen.getByRole('button', { name: 'Verify' }));
  expect(await screen.findByText('Invalid or expired code')).toBeOnTheScreen();
});

it('resends the code', async () => {
  jest.mocked(authApi.resendVerification).mockResolvedValue(undefined as never);
  await renderScreen(<VerifyEmailScreen email="ada@example.com" />);
  await user().press(screen.getByRole('link', { name: 'Resend code' }));
  expect(authApi.resendVerification).toHaveBeenCalledWith({ email: 'ada@example.com' });
  expect(await screen.findByText(/Code sent/)).toBeOnTheScreen();
});
