import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { TextLink } from './text-link';

const meta = {
  title: 'Components/Auth/TextLink',
  component: TextLink,
  args: { label: 'Forgot password?', onPress: fn() },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
