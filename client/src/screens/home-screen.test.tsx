import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';
import type { Friend, Me, Nudge } from '@/api/types';
import * as friendsApi from '@/api/friends';
import * as nudgesApi from '@/api/nudges';
import * as usersApi from '@/api/users';

import { HomeScreen } from './home-screen';

jest.mock('@/api/users');
jest.mock('@/api/friends');
jest.mock('@/api/nudges');

const NOW = new Date('2026-09-14T12:00:00Z');

const ME: Me = {
  id: 'user-1',
  name: 'Sandra',
  timezone: 'Europe/Prague',
  preferredReminderLocalTime: '18:00:00',
  nudgeEnabled: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function friend(id: string, name: string, scheduledFor: string): Friend {
  return {
    id,
    name,
    periodicity: 'MONTHLY',
    lastContactAt: null,
    nudgeEnabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    nudge: {
      id: `nudge-${id}`,
      scheduledFor,
      status: 'PLANNED',
      revision: 1,
      lastEditedAt: '2026-01-01T00:00:00Z',
    },
  };
}

const FRIENDS: Friend[] = [
  friend('overdue-1', 'Anastasia Kleisioni', '2025-12-01T12:00:00Z'),
  friend('overdue-2', 'Joni Trevo', '2026-08-01T12:00:00Z'),
  friend('upcoming-1', 'Elia Cagnazo', '2026-10-01T12:00:00Z'),
];

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

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.mocked(usersApi.getMe).mockResolvedValue(ME);
    jest.mocked(friendsApi.listFriends).mockResolvedValue(FRIENDS);
    jest.mocked(nudgesApi.confirmNudge).mockResolvedValue({
      id: 'nudge-overdue-1',
      scheduledFor: '2026-10-14T12:00:00Z',
      status: 'PLANNED',
      revision: 2,
      lastEditedAt: NOW.toISOString(),
    } satisfies Nudge);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('greets the user and summarizes overdue count, listing overdue friends by default', async () => {
    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByText('Hello Sandra.')).toBeOnTheScreen());
    expect(screen.getByText('You have 2 check-ins overdue now')).toBeOnTheScreen();
    expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen();
    expect(screen.getByText('Joni Trevo')).toBeOnTheScreen();
    expect(screen.queryByText('Elia Cagnazo')).toBeNull();
  });

  it('switches to the upcoming list when that tab is pressed', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen());

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('tab', { name: 'Upcoming' }));

    expect(screen.getByText('Elia Cagnazo')).toBeOnTheScreen();
    expect(screen.queryByText('Anastasia Kleisioni')).toBeNull();
  });

  it('shows time until the nudge, not last-contact time, for upcoming friends', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen());

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('tab', { name: 'Upcoming' }));

    // Elia's nudge is scheduled 2026-10-01T12:00:00Z, 17 days after NOW.
    expect(screen.getByText('in 17 d')).toBeOnTheScreen();
  });

  it('confirms the nudge and refetches friends when a friend is checked off', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen());
    const callsBeforeConfirm = jest.mocked(friendsApi.listFriends).mock.calls.length;

    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('checkbox', { name: 'Select Anastasia Kleisioni' }));

    await waitFor(() => expect(nudgesApi.confirmNudge).toHaveBeenCalledWith('nudge-overdue-1', 1));
    await waitFor(() =>
      expect(jest.mocked(friendsApi.listFriends).mock.calls.length).toBeGreaterThan(
        callsBeforeConfirm,
      ),
    );
  });
});
