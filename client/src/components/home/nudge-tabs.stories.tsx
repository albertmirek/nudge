import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { NudgeTabs } from './nudge-tabs';

const meta = {
  title: 'Components/NudgeTabs',
  component: NudgeTabs,
  args: {
    value: 'overdue',
    onChange: fn(),
    overdueCount: 3,
  },
} satisfies Meta<typeof NudgeTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const UpcomingSelected: Story = { args: { value: 'upcoming' } };

export const NothingOverdue: Story = { args: { overdueCount: 0 } };
