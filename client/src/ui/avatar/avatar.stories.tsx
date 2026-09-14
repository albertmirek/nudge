import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from './avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  args: { label: 'Anastasia Kleisioni' },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const WithImage: Story = {
  args: { source: 'https://i.pravatar.cc/98?img=47' },
};

export const Large: Story = { args: { size: 80 } };
