import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { validateCredentials } from '@/lib/auth';

import { SignInForm } from './sign-in-form';

const meta = {
  title: 'Components/Auth/SignInForm',
  component: SignInForm,
  args: {
    values: { email: '', password: '' },
    onChange: fn(),
    onSubmit: fn(),
    onForgotPassword: fn(),
    onCreateAccount: fn(),
  },
} satisfies Meta<typeof SignInForm>;

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
  args: { serverError: 'Wrong email or password' },
};

export const Loading: Story = { args: { loading: true } };
