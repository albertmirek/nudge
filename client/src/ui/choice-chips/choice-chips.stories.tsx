import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { ChoiceChips, type ChoiceChipsProps } from './choice-chips';

const OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

const meta = {
  title: 'UI/ChoiceChips',
  component: ChoiceChips,
  args: { label: 'Contact Frequency', options: OPTIONS, value: 'MONTHLY', onChange: fn() },
} satisfies Meta<typeof ChoiceChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NothingSelected: Story = { args: { value: null } };

export const WithError: Story = { args: { value: null, error: 'Pick how often to check in' } };

function InteractiveChips(args: ChoiceChipsProps<string>) {
  const [value, setValue] = useState(args.value);
  return <ChoiceChips {...args} value={value} onChange={setValue} />;
}

export const Interactive: Story = { render: (args) => <InteractiveChips {...args} /> };
