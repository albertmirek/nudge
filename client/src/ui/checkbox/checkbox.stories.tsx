import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Checkbox, type CheckboxProps } from './checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: { checked: false, onCheckedChange: fn(), accessibilityLabel: 'Contacted' },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, checked: true } };

function InteractiveCheckbox(args: CheckboxProps) {
  const [checked, setChecked] = useState(args.checked);
  return <Checkbox {...args} checked={checked} onCheckedChange={setChecked} />;
}

/** Toggle it on the device/browser. */
export const Interactive: Story = {
  render: (args) => <InteractiveCheckbox {...args} />,
};
