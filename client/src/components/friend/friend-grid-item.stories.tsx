import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { FriendGridItem } from './friend-grid-item';

const meta = {
  title: 'Components/FriendGridItem',
  component: FriendGridItem,
  args: { name: 'Anastasia Kleisioni', onPress: fn() },
} satisfies Meta<typeof FriendGridItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAvatarImage: Story = {
  args: { avatarUri: 'https://i.pravatar.cc/168?img=47' },
};

export const LongFirstName: Story = {
  args: { name: 'Maximiliana-Alexandrina Popescu' },
};
