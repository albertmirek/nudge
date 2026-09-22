import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { validateCode } from '@/lib/auth';

import { CodeForm } from './code-form';

const meta = {
  title: 'Components/Auth/CodeForm',
  component: CodeForm,
  args: {
    values: { code: '' },
    onChange: fn(),
    onSubmit: fn(),
    submitLabel: 'Verify',
    onResend: fn(),
  },
} satisfies Meta<typeof CodeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { values: { code: '123456' } } };

export const WithErrors: Story = {
  args: { values: { code: '12' }, errors: validateCode({ code: '12' }) },
};

export const ServerError: Story = { args: { serverError: 'That code has expired' } };

export const Loading: Story = { args: { loading: true } };

export const WithoutResend: Story = { args: { onResend: undefined } };
