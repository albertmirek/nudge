import { composeStories } from '@storybook/react';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { Channel } from '@/api/types';
import { pickContactValues, readClipboard } from '@/lib/device-input';
import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ChannelModal, type ChannelModalProps } from './channel-modal';
import * as stories from './channel-modal.stories';

jest.mock('@/lib/device-input', () => ({ readClipboard: jest.fn(), pickContactValues: jest.fn() }));
jest.mock('@/lib/channels', () => ({
  ...jest.requireActual('@/lib/channels'),
  deviceCountry: () => 'CZ',
}));

const CHANNEL: Channel = {
  id: 'c1',
  type: 'INSTAGRAM',
  handle: 'jan.novak',
  deepLink: null,
  link: 'https://ig.me/m/jan.novak',
};

function props(overrides: Partial<ChannelModalProps> = {}): ChannelModalProps {
  return {
    visible: true,
    onCreate: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    onTest: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

const user = () => userEvent.setup();

beforeEach(() => {
  jest.mocked(readClipboard).mockResolvedValue('');
  jest.mocked(pickContactValues).mockResolvedValue(null);
});

afterEach(() => jest.restoreAllMocks());

describe('ChannelModal', () => {
  it('adds a phone channel: platform → number → confirm → save', async () => {
    const p = props();
    await renderWithTheme(<ChannelModal {...p} />);
    await user().press(screen.getByRole('button', { name: 'WhatsApp' }));
    await user().type(screen.getByLabelText('Phone number'), '777 123 456');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('WhatsApp · +420 777 123 456')).toBeOnTheScreen();
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onCreate).toHaveBeenCalledWith({ type: 'WHATSAPP', handle: '+420777123456' });
  });

  it('shows an inline error for input that does not parse', async () => {
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Telegram' }));
    await user().type(screen.getByLabelText('Username'), 'ab');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    expect(
      screen.getByText("That doesn't look like a Telegram username or link."),
    ).toBeOnTheScreen();
  });

  it('offers a recognized clipboard link and jumps to confirm', async () => {
    jest.mocked(readClipboard).mockResolvedValue('https://www.instagram.com/jan.novak?igsh=x');
    const p = props();
    await renderWithTheme(<ChannelModal {...p} />);
    const suggestion = await screen.findByRole('button', { name: 'Use Instagram @jan.novak' });
    await user().press(suggestion);
    expect(screen.getByText('Instagram · @jan.novak')).toBeOnTheScreen();
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onCreate).toHaveBeenCalledWith({ type: 'INSTAGRAM', handle: 'jan.novak' });
  });

  it('re-reads the clipboard when the app returns to the foreground', async () => {
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    });
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Instagram' }));
    jest.mocked(readClipboard).mockResolvedValue('https://instagram.com/jan.novak');
    await act(async () => listeners.forEach((listener) => listener('active')));
    expect(
      await screen.findByRole('button', { name: 'Use Instagram @jan.novak' }),
    ).toBeOnTheScreen();
  });

  it('fills a phone from a picked contact, asking which value when there are several', async () => {
    jest.mocked(pickContactValues).mockResolvedValue(['+420 777 123 456', '+420 602 000 111']);
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Signal' }));
    await user().press(screen.getByRole('button', { name: 'Pick from contacts' }));
    await user().press(await screen.findByText('+420 602 000 111'));
    expect(screen.getByLabelText('Phone number')).toHaveDisplayValue('+420 602 000 111');
  });

  it('pastes into the field', async () => {
    jest.mocked(readClipboard).mockResolvedValue('');
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Instagram' }));
    jest.mocked(readClipboard).mockResolvedValue('@jan.novak');
    await user().press(screen.getByRole('button', { name: 'Paste' }));
    await waitFor(() => expect(screen.getByLabelText('Username')).toHaveDisplayValue('@jan.novak'));
  });

  it('adds OTHER with a label and a link', async () => {
    const p = props();
    await renderWithTheme(<ChannelModal {...p} />);
    await user().press(screen.getByRole('button', { name: 'Other' }));
    await user().type(screen.getByLabelText('Label'), 'Discord');
    await user().type(screen.getByLabelText('Link'), 'https://discord.com/users/1');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onCreate).toHaveBeenCalledWith({
      type: 'OTHER',
      handle: 'Discord',
      deepLink: 'https://discord.com/users/1',
    });
  });

  it('edits: starts at details with the handle, updates, tests and deletes', async () => {
    const p = props({ channel: CHANNEL });
    await renderWithTheme(<ChannelModal {...p} />);
    expect(screen.getByLabelText('Username')).toHaveDisplayValue('jan.novak');
    await user().press(screen.getByRole('button', { name: 'Test' }));
    expect(p.onTest).toHaveBeenCalledWith(CHANNEL);
    await user().press(screen.getByRole('button', { name: 'Delete' }));
    expect(p.onDelete).toHaveBeenCalledTimes(1);
    await user().clear(screen.getByLabelText('Username'));
    await user().type(screen.getByLabelText('Username'), 'jan.novak2');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onUpdate).toHaveBeenCalledWith({ handle: 'jan.novak2' });
  });

  it('rejects a pasted link for a different platform when editing', async () => {
    const p = props({
      channel: { ...CHANNEL, type: 'TELEGRAM', handle: 'jannovak', link: 'https://t.me/jannovak' },
    });
    await renderWithTheme(<ChannelModal {...p} />);
    await user().clear(screen.getByLabelText('Username'));
    await user().type(screen.getByLabelText('Username'), 'https://instagram.com/jan_novak2');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    expect(
      screen.getByText('That link is for Instagram — this channel is Telegram.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Instagram · @jan_novak2/)).not.toBeOnTheScreen();
    expect(p.onUpdate).not.toHaveBeenCalled();
  });

  it('shows the submit error and closes from Cancel', async () => {
    const p = props({ error: 'This friend already has that channel' });
    await renderWithTheme(<ChannelModal {...p} />);
    expect(screen.getByText('This friend already has that channel')).toBeOnTheScreen();
    await user().press(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });
});

describeStories('ChannelModal', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
