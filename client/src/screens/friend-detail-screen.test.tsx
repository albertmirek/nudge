import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import * as catchUpsApi from '@/api/catch-ups';
import * as friendsApi from '@/api/friends';
import { ApiError } from '@/api/http';
import * as nudgesApi from '@/api/nudges';
import type { CatchUp, Friend } from '@/api/types';
import { ThemeProvider } from '@/theme';

import { FriendDetailScreen } from './friend-detail-screen';

jest.mock('@/api/friends');
jest.mock('@/api/catch-ups');
jest.mock('@/api/nudges');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const NOW = new Date('2026-09-17T12:00:00Z');

const FRIEND: Friend = {
  id: 'friend-1',
  name: 'Anastasia Kleisioni',
  periodicity: 'MONTHLY',
  lastContactAt: '2025-01-03T10:00:00Z',
  nudgeEnabled: true,
  metAt: 'Stockholm University',
  livesIn: 'Athens',
  birthday: '2000-07-13',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  nudge: {
    id: 'nudge-1',
    scheduledFor: '2025-02-03T17:00:00Z',
    status: 'PLANNED',
    revision: 4,
    lastEditedAt: '2025-01-03T10:00:00Z',
  },
  channels: [],
};

const NOTES: CatchUp[] = [
  { id: 'n2', note: 'Coffee downtown', createdAt: '2025-03-14T18:30:00Z' },
  { id: 'n1', note: 'Long call about her move', createdAt: '2025-01-03T10:00:00Z' },
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

const router = { back: jest.fn(), navigate: jest.fn() };
const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('FriendDetailScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
    jest.mocked(friendsApi.getFriend).mockResolvedValue(FRIEND);
    jest.mocked(friendsApi.updateFriend).mockResolvedValue({ ...FRIEND, livesIn: 'Berlin' });
    jest.mocked(catchUpsApi.listCatchUps).mockResolvedValue(NOTES);
    jest.mocked(catchUpsApi.createCatchUp).mockResolvedValue({
      id: 'n3',
      note: 'New',
      createdAt: NOW.toISOString(),
    });
    jest.mocked(catchUpsApi.updateCatchUp).mockResolvedValue({ ...NOTES[0]!, note: 'Edited' });
    jest.mocked(nudgesApi.confirmNudge).mockResolvedValue({ ...FRIEND.nudge!, revision: 5 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the profile, the notes newest first and the Contact action', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Anastasia Kleisioni');
    expect(screen.getByText('Long call about her move')).toBeOnTheScreen();
    const cards = screen.getAllByRole('button', { name: /^Note from/ });
    expect(cards.map((card) => card.props.accessibilityLabel)).toEqual([
      'Note from 14/03/2025',
      'Note from 03/01/2025',
    ]);
    expect(screen.getByRole('button', { name: 'Contact' })).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'Add a friend' })).not.toBeOnTheScreen();
  });

  it('goes back from the chevron and to a tab from the bar', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    await user().press(screen.getByRole('tab', { name: 'Home' }));
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)');
  });

  it('edits the profile and sends only the changed fields on Save', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Edit profile' }));
    await user().clear(screen.getByLabelText('Lives in'));
    await user().type(screen.getByLabelText('Lives in'), 'Berlin');
    await user().press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(friendsApi.updateFriend).toHaveBeenCalledWith('friend-1', { livesIn: 'Berlin' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit profile' })).toBeOnTheScreen(),
    );
  });

  it('leaves edit mode without a request when nothing changed', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Edit profile' }));
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(friendsApi.updateFriend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeOnTheScreen();
  });

  it('keeps edit mode open and shows the error for an invalid profile', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Edit profile' }));
    await user().clear(screen.getByLabelText('Name'));
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Name is required')).toBeOnTheScreen();
    expect(friendsApi.updateFriend).not.toHaveBeenCalled();
  });

  it('creates a note from the "+" and refetches the list', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    const listCallsBefore = jest.mocked(catchUpsApi.listCatchUps).mock.calls.length;
    await user().press(screen.getByRole('button', { name: 'Add note' }));
    await user().type(screen.getByLabelText('Note'), 'New');
    await user().press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(catchUpsApi.createCatchUp).toHaveBeenCalledWith('friend-1', 'New'));
    await waitFor(() => expect(screen.queryByLabelText('Note')).not.toBeOnTheScreen());
    expect(jest.mocked(catchUpsApi.listCatchUps).mock.calls.length).toBeGreaterThan(
      listCallsBefore,
    );
  });

  it('opens a note in the modal and saves the edited text', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Note from 14/03/2025' }));
    expect(screen.getByLabelText('Note')).toHaveDisplayValue('Coffee downtown');
    await user().type(screen.getByLabelText('Note'), '!');
    await user().press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(catchUpsApi.updateCatchUp).toHaveBeenCalledWith('friend-1', 'n2', 'Coffee downtown!'),
    );
    await waitFor(() => expect(screen.queryByLabelText('Note')).not.toBeOnTheScreen());
  });

  it('keeps the modal open and shows the message when saving fails', async () => {
    jest.mocked(catchUpsApi.createCatchUp).mockRejectedValue(new ApiError(500, 'Server down'));
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Add note' }));
    await user().type(screen.getByLabelText('Note'), 'New');
    await user().press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Server down')).toBeOnTheScreen());
    expect(screen.getByLabelText('Note')).toBeOnTheScreen();
  });

  it('records contact with the current nudge revision from the Contact button', async () => {
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    const friendCallsBefore = jest.mocked(friendsApi.getFriend).mock.calls.length;
    await user().press(screen.getByRole('button', { name: 'Contact' }));
    await waitFor(() => expect(nudgesApi.confirmNudge).toHaveBeenCalledWith('nudge-1', 4));
    await waitFor(() =>
      expect(jest.mocked(friendsApi.getFriend).mock.calls.length).toBeGreaterThan(
        friendCallsBefore,
      ),
    );
  });

  it('asks to retry after a stale revision conflict', async () => {
    jest.mocked(nudgesApi.confirmNudge).mockRejectedValue(new ApiError(409, 'Nudge changed'));
    await renderScreen(<FriendDetailScreen friendId="friend-1" />);
    await waitFor(() => expect(screen.getByText('Coffee downtown')).toBeOnTheScreen());
    await user().press(screen.getByRole('button', { name: 'Contact' }));
    await waitFor(() =>
      expect(
        screen.getByText('This reminder changed elsewhere. Reloaded — try again.'),
      ).toBeOnTheScreen(),
    );
  });

  it('shows an error state when the friend cannot be loaded', async () => {
    jest.mocked(friendsApi.getFriend).mockRejectedValue(new ApiError(404, 'Friend not found'));
    await renderScreen(<FriendDetailScreen friendId="missing" />);
    await waitFor(() => expect(screen.getByText("Couldn't load this friend.")).toBeOnTheScreen());
  });
});
