import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { NoteModal } from './note-modal';
import * as stories from './note-modal.stories';

describe('NoteModal', () => {
  it('renders nothing while closed', async () => {
    await renderWithTheme(<NoteModal visible={false} onSave={() => {}} onClose={() => {}} />);
    expect(screen.queryByLabelText('Note')).not.toBeOnTheScreen();
  });

  it('creates a new note: Save is disabled until there is text', async () => {
    const onSave = jest.fn();
    await renderWithTheme(<NoteModal visible onSave={onSave} onClose={() => {}} />);
    expect(screen.getByText('New note')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.setup().type(screen.getByLabelText('Note'), 'Coffee downtown');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('Coffee downtown');
  });

  it('edits an existing note, starting from its text', async () => {
    const onSave = jest.fn();
    await renderWithTheme(
      <NoteModal visible initialNote="Coffee" onSave={onSave} onClose={() => {}} />,
    );
    expect(screen.getByText('Edit note')).toBeOnTheScreen();
    expect(screen.getByLabelText('Note')).toHaveDisplayValue('Coffee');
    await userEvent.setup().type(screen.getByLabelText('Note'), ' downtown');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('Coffee downtown');
  });

  it('treats whitespace-only text as empty', async () => {
    await renderWithTheme(<NoteModal visible onSave={() => {}} onClose={() => {}} />);
    await userEvent.setup().type(screen.getByLabelText('Note'), '   ');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('closes from Cancel and shows a submit error', async () => {
    const onClose = jest.fn();
    await renderWithTheme(
      <NoteModal visible onSave={() => {}} onClose={onClose} error="Network down" />,
    );
    expect(screen.getByText('Network down')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describeStories('NoteModal', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
