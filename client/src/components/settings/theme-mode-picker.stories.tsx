import type { Meta, StoryObj } from '@storybook/react';

import { ThemeModePicker } from './theme-mode-picker';

const meta = {
  title: 'Components/ThemeModePicker',
  component: ThemeModePicker,
} satisfies Meta<typeof ThemeModePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Tapping an option re-themes the story canvas — the decorator's ThemeProvider is the one being driven. */
export const Default: Story = {};
