import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { validateEmailOnly } from '@/lib/auth';

import { ForgotPasswordForm } from './forgot-password-form';

const meta = {
  title: 'Components/Auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
  args: {
    values: { email: '' },
    onChange: fn(),
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { values: { email: 'anastasia@example.com' } } };

export const WithErrors: Story = {
  args: { values: { email: 'nope' }, errors: validateEmailOnly({ email: 'nope' }) },
};

export const ServerError: Story = { args: { serverError: 'No account with that email' } };

export const Loading: Story = { args: { loading: true } };
