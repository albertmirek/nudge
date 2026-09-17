import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { ApiError } from '@/api/http';
import * as friendsApi from '@/api/friends';
import type { Friend } from '@/api/types';
import { ThemeProvider } from '@/theme';

import { CreateFriendScreen } from './create-friend-screen';

jest.mock('@/api/friends');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const NOW = new Date('2026-09-17T12:00:00Z');

const CREATED: Friend = {
  id: 'friend-1',
  name: 'Alice',
  periodicity: 'MONTHLY',
  lastContactAt: null,
  nudgeEnabled: true,
  metAt: null,
  livesIn: null,
  birthday: null,
  notes: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  nudge: null,
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

const router = { replace: jest.fn() };

describe('CreateFriendScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.mocked(useRouter).mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
    jest.mocked(friendsApi.createFriend).mockResolvedValue(CREATED);
    router.replace.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  it('shows the title, the form and a Save button', async () => {
    await renderScreen(<CreateFriendScreen />);
    expect(screen.getByText('Add a friend')).toBeOnTheScreen();
    expect(screen.getByLabelText('Name')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
  });

  it('validates instead of submitting an empty form', async () => {
    await renderScreen(<CreateFriendScreen />);
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Name is required')).toBeOnTheScreen();
    expect(screen.getByText('Pick how often to check in')).toBeOnTheScreen();
    expect(friendsApi.createFriend).not.toHaveBeenCalled();
  });

  it('submits the form and goes home once the friend is created', async () => {
    await renderScreen(<CreateFriendScreen />);
    await user().type(screen.getByLabelText('Name'), 'Alice');
    await user().press(screen.getByRole('radio', { name: 'Monthly' }));
    await user().type(screen.getByLabelText('Lives in'), 'Berlin');
    await user().press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(friendsApi.createFriend).toHaveBeenCalledWith({
        name: 'Alice',
        periodicity: 'MONTHLY',
        livesIn: 'Berlin',
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('shows the server error and stays on the form when saving fails', async () => {
    jest.mocked(friendsApi.createFriend).mockRejectedValue(new ApiError(400, 'name is too long'));
    await renderScreen(<CreateFriendScreen />);
    await user().type(screen.getByLabelText('Name'), 'Alice');
    await user().press(screen.getByRole('radio', { name: 'Weekly' }));
    await user().press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('name is too long')).toBeOnTheScreen());
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Alice');
  });
});
