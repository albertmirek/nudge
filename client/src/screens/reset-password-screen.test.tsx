import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/http';
import { useSession } from '@/auth/session';
import { ThemeProvider } from '@/theme';

import { ResetPasswordScreen } from './reset-password-screen';

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

it('renders the code and new password fields', async () => {
  await renderScreen(<ResetPasswordScreen email="ada@example.com" />);
  expect(screen.getByText('Use the code we sent to ada@example.com.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Code')).toBeOnTheScreen();
  expect(screen.getByLabelText('New password')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Save password' })).toBeOnTheScreen();
});

it('validates before submitting', async () => {
  await renderScreen(<ResetPasswordScreen email="ada@example.com" />);
  await user().press(screen.getByRole('button', { name: 'Save password' }));
  expect(screen.getByText('Enter the 6-digit code')).toBeOnTheScreen();
  expect(authApi.resetPassword).not.toHaveBeenCalled();
});

it('resets the password and hands the session over', async () => {
  jest.mocked(authApi.resetPassword).mockResolvedValue(SESSION as never);
  await renderScreen(<ResetPasswordScreen email="ada@example.com" />);
  await user().type(screen.getByLabelText('Code'), '123456');
  await user().type(screen.getByLabelText('New password'), 'brand new pw');
  await user().press(screen.getByRole('button', { name: 'Save password' }));
  await waitFor(() => expect(session.signIn).toHaveBeenCalledWith(SESSION));
  expect(authApi.resetPassword).toHaveBeenCalledWith({
    email: 'ada@example.com',
    code: '123456',
    newPassword: 'brand new pw',
  });
});

it('shows the server message on 400', async () => {
  jest
    .mocked(authApi.resetPassword)
    .mockRejectedValue(new ApiError(400, 'Invalid or expired code'));
  await renderScreen(<ResetPasswordScreen email="ada@example.com" />);
  await user().type(screen.getByLabelText('Code'), '123456');
  await user().type(screen.getByLabelText('New password'), 'brand new pw');
  await user().press(screen.getByRole('button', { name: 'Save password' }));
  expect(await screen.findByText('Invalid or expired code')).toBeOnTheScreen();
});
