import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { NoteCard } from './note-card';
import * as stories from './note-card.stories';

const NOTE = { id: 'n1', note: 'Long call about her move', createdAt: '2025-01-03T10:00:00Z' };

describe('NoteCard', () => {
  it('shows the note text and the day it was written, and opens on press', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<NoteCard note={NOTE} onPress={onPress} />);
    expect(screen.getByText('Long call about her move')).toBeOnTheScreen();
    expect(screen.getByText('03/01/2025')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Note from 03/01/2025' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describeStories('NoteCard', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
