import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import type { Channel } from '@/api/types';

import { ChannelList } from './channel-list';

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

const meta = {
  title: 'Components/ChannelList',
  component: ChannelList,
  args: { channels: CHANNELS, onOpen: fn(), onEdit: fn(), onAdd: fn() },
} satisfies Meta<typeof ChannelList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { channels: [] } };
