import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Friend } from '@/api/types';
import { friendToProfileValues } from '@/lib/friend-form';
import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { FriendProfile } from './friend-profile';
import * as stories from './friend-profile.stories';

const FRIEND: Friend = {
  id: 'friend-1',
  name: 'Anastasia Kleisioni',
  periodicity: 'MONTHLY',
  lastContactAt: '2025-01-03T10:00:00Z',
  nudgeEnabled: true,
  metAt: 'Stockholm University',
  livesIn: 'Athens',
  birthday: '2000-07-13',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  nudge: null,
  channels: [],
};

const baseProps = {
  friend: FRIEND,
  editing: false,
  values: friendToProfileValues(FRIEND),
  onChange: () => {},
  onEdit: () => {},
  onSave: () => {},
};

describe('FriendProfile', () => {
  it('shows the profile read-only with formatted dates and a pencil', async () => {
    await renderWithTheme(<FriendProfile {...baseProps} />);
    for (const label of ['Name', 'Birthday', 'Met at', 'Lives in']) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Anastasia Kleisioni');
    expect(screen.getByLabelText('Birthday')).toHaveDisplayValue('13/07/2000');
    expect(screen.getByText('monthly')).toBeOnTheScreen();
    expect(screen.getByText('03/01/2025')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Monthly' })).not.toBeOnTheScreen();
  });

  it('shows "Never" for a friend without contact history', async () => {
    await renderWithTheme(
      <FriendProfile {...baseProps} friend={{ ...FRIEND, lastContactAt: null }} />,
    );
    expect(screen.getByText('Never')).toBeOnTheScreen();
  });

  it('enables the fields, shows frequency chips and a Save button while editing', async () => {
    const onChange = jest.fn();
    const onSave = jest.fn();
    await renderWithTheme(
      <FriendProfile {...baseProps} editing onChange={onChange} onSave={onSave} />,
    );
    for (const label of ['Name', 'Birthday', 'Met at', 'Lives in']) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
    // The raw YYYY-MM-DD value is edited, matching the add-a-friend form.
    expect(screen.getByLabelText('Birthday')).toHaveDisplayValue('2000-07-13');
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('radio', { name: 'Weekly' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...baseProps.values, periodicity: 'WEEKLY' });
    await userEvent.setup().type(screen.getByLabelText('Lives in'), '!');
    expect(onChange).toHaveBeenLastCalledWith({ ...baseProps.values, livesIn: 'Athens!' });

    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('keeps Last Contact read-only while editing', async () => {
    await renderWithTheme(<FriendProfile {...baseProps} editing />);
    expect(screen.getByText('03/01/2025')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Last Contact')).not.toBeOnTheScreen();
  });

  it('calls onEdit from the pencil', async () => {
    const onEdit = jest.fn();
    await renderWithTheme(<FriendProfile {...baseProps} onEdit={onEdit} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('shows field errors while editing', async () => {
    await renderWithTheme(
      <FriendProfile {...baseProps} editing errors={{ name: 'Name is required' }} />,
    );
    expect(screen.getByText('Name is required')).toBeOnTheScreen();
  });
});

describeStories('FriendProfile', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
