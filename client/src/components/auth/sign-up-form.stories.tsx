import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { validateCredentials } from '@/lib/auth';

import { SignUpForm } from './sign-up-form';

const meta = {
  title: 'Components/Auth/SignUpForm',
  component: SignUpForm,
  args: {
    values: { email: '', password: '' },
    onChange: fn(),
    onSubmit: fn(),
    onSignIn: fn(),
  },
} satisfies Meta<typeof SignUpForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { values: { email: 'anastasia@example.com', password: 'hunter22' } },
};

export const WithErrors: Story = {
  args: {
    values: { email: 'nope', password: 'short' },
    errors: validateCredentials({ email: 'nope', password: 'short' }),
  },
};

export const ServerError: Story = {
  args: { serverError: 'Email already in use' },
};

export const Loading: Story = { args: { loading: true } };
