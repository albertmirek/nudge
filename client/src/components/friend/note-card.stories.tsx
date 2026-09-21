import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { NoteCard } from './note-card';

const meta = {
  title: 'Components/NoteCard',
  component: NoteCard,
  args: {
    note: {
      id: 'n1',
      note: 'Long call about her move to Athens',
      createdAt: '2025-01-03T10:00:00Z',
    },
    onPress: fn(),
  },
} satisfies Meta<typeof NoteCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongNote: Story = {
  args: {
    note: {
      id: 'n2',
      note: 'She is starting the new job in May and still deciding between the flat near the sea and the one downtown. Ask how the interview with the second company went and whether her brother visited.',
      createdAt: '2025-03-14T18:30:00Z',
    },
  },
};
