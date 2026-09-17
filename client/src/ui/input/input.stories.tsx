import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Input, type InputProps } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { label: 'Name', value: '', onChangeText: fn() },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { value: 'Anastasia Kleisioni' } };

export const WithPlaceholder: Story = { args: { label: 'Birthday', placeholder: 'YYYY-MM-DD' } };

export const WithError: Story = {
  args: { label: 'Birthday', value: '17.05.1990', error: 'Use the YYYY-MM-DD format' },
};

export const Multiline: Story = {
  args: { label: 'Notes', value: 'Loves hiking.\nAllergic to cats.', multiline: true },
};

function InteractiveInput(args: InputProps) {
  const [value, setValue] = useState(args.value);
  return <Input {...args} value={value} onChangeText={setValue} />;
}

/** Type into it on the device/browser. */
export const Interactive: Story = { render: (args) => <InteractiveInput {...args} /> };
