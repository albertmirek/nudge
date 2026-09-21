import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { FriendListRow } from './friend-list-row';

const meta = {
  title: 'Components/FriendListRow',
  component: FriendListRow,
  args: { name: 'Anastasia Kleisioni', onPress: fn() },
} satisfies Meta<typeof FriendListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAvatarImage: Story = {
  args: { avatarUri: 'https://i.pravatar.cc/98?img=47' },
};

export const LongName: Story = {
  args: { name: 'Anastasia Kleisioni-Papadopoulou of Thessaloniki' },
};
