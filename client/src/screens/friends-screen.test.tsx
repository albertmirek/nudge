import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import * as friendsApi from '@/api/friends';
import type { Friend } from '@/api/types';
import { ThemeProvider } from '@/theme';

import { FriendsScreen } from './friends-screen';

jest.mock('@/api/friends');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

function friend(id: string, name: string): Friend {
  return {
    id,
    name,
    periodicity: 'MONTHLY',
    lastContactAt: null,
    nudgeEnabled: true,
    metAt: null,
    livesIn: null,
    birthday: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    nudge: null,
    channels: [],
  };
}

const FRIENDS: Friend[] = [
  friend('joni', 'Joni Trevo'),
  friend('anastasia', 'Anastasia Kleisioni'),
  friend('bef', 'Bef Özgür'),
  friend('aku', 'Aku Koskien'),
];

function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider initialMode="light">{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

const router = { push: jest.fn() };

describe('FriendsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useRouter).mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
    jest.mocked(friendsApi.listFriends).mockResolvedValue(FRIENDS);
    router.push.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  it('shows the title and every friend as a grid tile by default', async () => {
    await renderScreen(<FriendsScreen />);

    expect(screen.getByText('Your friend list')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('Anastasia')).toBeOnTheScreen());
    expect(screen.getByText('Aku')).toBeOnTheScreen();
    expect(screen.getByText('Bef')).toBeOnTheScreen();
    expect(screen.getByText('Joni')).toBeOnTheScreen();
    expect(screen.queryByText('Anastasia Kleisioni')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show as list' })).toBeOnTheScreen();
  });

  it('switches to an alphabetical list with letter headers, and back to the grid', async () => {
    await renderScreen(<FriendsScreen />);
    await waitFor(() => expect(screen.getByText('Anastasia')).toBeOnTheScreen());

    await user().press(screen.getByRole('button', { name: 'Show as list' }));

    expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen();
    expect(screen.getByText('Bef Özgür')).toBeOnTheScreen();
    expect(screen.queryByText('Anastasia')).toBeNull();
    const headers = screen.getAllByRole('header').map((header) => header.props.children);
    expect(headers).toEqual(['A', 'B', 'J']);

    await user().press(screen.getByRole('button', { name: 'Show as grid' }));

    expect(screen.getByText('Anastasia')).toBeOnTheScreen();
    expect(screen.queryByRole('header')).toBeNull();
  });

  it('opens the friend profile when a friend is tapped', async () => {
    await renderScreen(<FriendsScreen />);
    await waitFor(() => expect(screen.getByText('Anastasia')).toBeOnTheScreen());

    await user().press(screen.getByRole('button', { name: 'Anastasia Kleisioni' }));

    expect(router.push).toHaveBeenCalledWith('/friend/anastasia');
  });

  it('shows an empty state when there are no friends', async () => {
    jest.mocked(friendsApi.listFriends).mockResolvedValue([]);
    await renderScreen(<FriendsScreen />);

    await waitFor(() =>
      expect(screen.getByText('No friends yet. Add one to get started.')).toBeOnTheScreen(),
    );
  });

  it('shows an error message when the list fails to load', async () => {
    jest.mocked(friendsApi.listFriends).mockRejectedValue(new Error('boom'));
    await renderScreen(<FriendsScreen />);

    await waitFor(() =>
      expect(screen.getByText("Couldn't load your friends. Try again shortly.")).toBeOnTheScreen(),
    );
  });
});
