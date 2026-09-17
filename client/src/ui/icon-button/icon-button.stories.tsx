import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { IconButton } from './icon-button';

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  args: { icon: 'plus', accessibilityLabel: 'Add note', onPress: fn() },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Bare icon, e.g. the "+" next to Notes or a tab bar item. */
export const Default: Story = {};

/** Figma's photo placeholder: large raised disc with a camera. */
export const Raised: Story = {
  args: { icon: 'camera', variant: 'raised', size: 'lg', accessibilityLabel: 'Add photo' },
};

export const Disabled: Story = { args: { disabled: true } };
