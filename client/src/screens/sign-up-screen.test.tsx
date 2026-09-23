import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import * as authApi from '@/api/auth';
import { ApiError } from '@/api/http';
import { useSession } from '@/auth/session';
import { ThemeProvider } from '@/theme';

import { SignUpScreen } from './sign-up-screen';

jest.mock('@/api/auth');
jest.mock('@/auth/session');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { push: jest.fn(), back: jest.fn() };
const session = { status: 'signedOut' as const, signIn: jest.fn(), signOut: jest.fn() };

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
  router.back.mockClear();
  session.signIn.mockClear();
});

const user = () => userEvent.setup();

async function fill(email: string, password: string) {
  await user().type(screen.getByLabelText('Email'), email);
  await user().type(screen.getByLabelText('Password'), password);
}

it('validates before submitting', async () => {
  await renderScreen(<SignUpScreen />);
  await user().press(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Enter your email')).toBeOnTheScreen();
  expect(authApi.signUp).not.toHaveBeenCalled();
});

it('signs up and routes to verification', async () => {
  jest.mocked(authApi.signUp).mockResolvedValue(undefined as never);
  await renderScreen(<SignUpScreen />);
  await fill('ada@example.com', 'password1');
  await user().press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/verify-email',
      params: { email: 'ada@example.com' },
    }),
  );
  expect(authApi.signUp).toHaveBeenCalledWith({
    email: 'ada@example.com',
    password: 'password1',
    timezone: expect.any(String),
  });
});

it('shows the server message on 409', async () => {
  jest.mocked(authApi.signUp).mockRejectedValue(new ApiError(409, 'Email is already registered'));
  await renderScreen(<SignUpScreen />);
  await fill('ada@example.com', 'password1');
  await user().press(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Email is already registered')).toBeOnTheScreen();
});

it('links back to sign-in', async () => {
  await renderScreen(<SignUpScreen />);
  await user().press(screen.getByRole('link', { name: 'Sign in' }));
  expect(router.back).toHaveBeenCalled();
});
