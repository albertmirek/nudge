import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { PasswordInput } from './password-input';

const meta = {
  title: 'Components/Auth/PasswordInput',
  component: PasswordInput,
  args: { label: 'Password', value: 'hunter22', onChangeText: fn() },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithError: Story = { args: { value: '', error: 'Enter your password' } };
