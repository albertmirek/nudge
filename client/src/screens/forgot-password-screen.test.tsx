import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import * as authApi from '@/api/auth';
import { ThemeProvider } from '@/theme';

import { ForgotPasswordScreen } from './forgot-password-screen';

jest.mock('@/api/auth');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { push: jest.fn(), back: jest.fn() };

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
  router.push.mockClear();
  router.back.mockClear();
});

const user = () => userEvent.setup();

it('validates before submitting', async () => {
  await renderScreen(<ForgotPasswordScreen />);
  await user().press(screen.getByRole('button', { name: 'Send code' }));
  expect(screen.getByText('Enter your email')).toBeOnTheScreen();
  expect(authApi.forgotPassword).not.toHaveBeenCalled();
});

it('sends the code and routes to reset password', async () => {
  jest.mocked(authApi.forgotPassword).mockResolvedValue(undefined as never);
  await renderScreen(<ForgotPasswordScreen />);
  await user().type(screen.getByLabelText('Email'), 'ada@example.com');
  await user().press(screen.getByRole('button', { name: 'Send code' }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/reset-password',
      params: { email: 'ada@example.com' },
    }),
  );
  expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: 'ada@example.com' });
});

it('links back to sign-in', async () => {
  await renderScreen(<ForgotPasswordScreen />);
  await user().press(screen.getByRole('link', { name: 'Back to sign in' }));
  expect(router.back).toHaveBeenCalled();
});
