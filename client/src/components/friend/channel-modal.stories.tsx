import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ChannelModal } from './channel-modal';

const meta = {
  title: 'Components/ChannelModal',
  component: ChannelModal,
  args: {
    visible: true,
    onCreate: fn(),
    onUpdate: fn(),
    onDelete: fn(),
    onTest: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ChannelModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = {
  args: {
    channel: {
      id: 'c1',
      type: 'INSTAGRAM',
      handle: 'jan.novak',
      deepLink: null,
      link: 'https://ig.me/m/jan.novak',
    },
  },
};

export const WithError: Story = { args: { error: 'This friend already has that channel' } };
