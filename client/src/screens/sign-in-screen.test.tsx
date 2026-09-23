import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/http';
import { useSession } from '@/auth/session';
import { ThemeProvider } from '@/theme';

import { SignInScreen } from './sign-in-screen';

jest.mock('@/api/auth');
jest.mock('@/auth/session');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { push: jest.fn() };
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
  jest.mocked(useRouter).mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
  jest.mocked(useSession).mockReturnValue(session);
  router.push.mockClear();
  session.signIn.mockClear();
});

const user = () => userEvent.setup();

async function fill(email: string, password: string) {
  await user().type(screen.getByLabelText('Email'), email);
  await user().type(screen.getByLabelText('Password'), password);
}

it('validates before submitting', async () => {
  await renderScreen(<SignInScreen />);
  await user().press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByText('Enter your email')).toBeOnTheScreen();
  expect(authApi.signIn).not.toHaveBeenCalled();
});

it('signs in and hands the session over', async () => {
  jest.mocked(authApi.signIn).mockResolvedValue(SESSION as never);
  await renderScreen(<SignInScreen />);
  await fill('ada@example.com', 'password1');
  await user().press(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(session.signIn).toHaveBeenCalledWith(SESSION));
  expect(authApi.signIn).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'password1' });
});

it('shows the server message on 401', async () => {
  jest.mocked(authApi.signIn).mockRejectedValue(new ApiError(401, 'Wrong email or password'));
  await renderScreen(<SignInScreen />);
  await fill('ada@example.com', 'password1');
  await user().press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Wrong email or password')).toBeOnTheScreen();
});

it('routes to verification on EMAIL_NOT_VERIFIED', async () => {
  jest
    .mocked(authApi.signIn)
    .mockRejectedValue(new ApiError(403, 'Email not verified', 'EMAIL_NOT_VERIFIED'));
  await renderScreen(<SignInScreen />);
  await fill('ada@example.com', 'password1');
  await user().press(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/verify-email',
      params: { email: 'ada@example.com' },
    }),
  );
});

it('links to sign-up and forgot-password', async () => {
  await renderScreen(<SignInScreen />);
  await user().press(screen.getByRole('link', { name: 'Create account' }));
  expect(router.push).toHaveBeenCalledWith('/sign-up');
  await user().press(screen.getByRole('link', { name: 'Forgot password?' }));
  expect(router.push).toHaveBeenCalledWith('/forgot-password');
});
