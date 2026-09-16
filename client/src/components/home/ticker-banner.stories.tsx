import type { Meta, StoryObj } from '@storybook/react';

import { TickerBanner } from './ticker-banner';

const meta = {
  title: 'Components/TickerBanner',
  component: TickerBanner,
  args: {
    text: 'stay in touch with your friends',
  },
} satisfies Meta<typeof TickerBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
