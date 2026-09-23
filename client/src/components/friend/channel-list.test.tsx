import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Channel } from '@/api/types';
import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ChannelList } from './channel-list';
import * as stories from './channel-list.stories';

const { Default } = composeStories(stories);

const CHANNELS: Channel[] = [
  {
    id: 'c1',
    type: 'WHATSAPP',
    handle: '+420777123456',
    deepLink: null,
    link: 'https://wa.me/420777123456',
  },
  {
    id: 'c2',
    type: 'INSTAGRAM',
    handle: 'jan.novak',
    deepLink: null,
    link: 'https://ig.me/m/jan.novak',
  },
];

describe('ChannelList', () => {
  it('shows each channel with its platform and handle', async () => {
    await render(<Default />);
    expect(screen.getByText('WhatsApp')).toBeOnTheScreen();
    expect(screen.getByText('+420 777 123 456')).toBeOnTheScreen();
    expect(screen.getByText('@jan.novak')).toBeOnTheScreen();
  });

  it('opens, edits and adds', async () => {
    const onOpen = jest.fn();
    const onEdit = jest.fn();
    const onAdd = jest.fn();
    await renderWithTheme(
      <ChannelList channels={CHANNELS} onOpen={onOpen} onEdit={onEdit} onAdd={onAdd} />,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Open Instagram' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2' }));
    await userEvent.setup().press(screen.getByRole('button', { name: 'Edit WhatsApp' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add a way to reach' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('invites adding the first channel when empty', async () => {
    await renderWithTheme(
      <ChannelList channels={[]} onOpen={() => {}} onEdit={() => {}} onAdd={() => {}} />,
    );
    expect(screen.getByText(/Add WhatsApp, Instagram/)).toBeOnTheScreen();
  });
});

describeStories('ChannelList', stories);

it('matches the default story snapshot', async () => {
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
