import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ContactRow } from './contact-row';

const NOW = new Date('2026-09-14T12:00:00Z');
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const meta = {
  title: 'Components/ContactRow',
  component: ContactRow,
  args: {
    name: 'Anastasia Kleisioni',
    lastContactAt: daysBefore(288),
    checked: false,
    onCheckedChange: fn(),
    onPress: fn(),
    now: NOW,
  },
} satisfies Meta<typeof ContactRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { checked: true } };

export const ContactedToday: Story = { args: { name: 'Aku Koskien', lastContactAt: NOW } };

export const NeverContacted: Story = { args: { name: 'Elia Cagnazo', lastContactAt: null } };

export const LongName: Story = {
  args: { name: 'Anastasia Kleisioni-Papadopoulou of Thessaloniki', lastContactAt: daysBefore(12) },
};

export const WithAvatarImage: Story = {
  args: { avatarUri: 'https://i.pravatar.cc/98?img=47' },
};

export const NotPressable: Story = { args: { onPress: undefined } };
