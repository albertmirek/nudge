import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { TextInput } from 'react-native';

import { emptyFriendForm } from '@/lib/friend-form';
import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { FriendForm } from './friend-form';
import * as stories from './friend-form.stories';

const baseProps = { values: emptyFriendForm(), onChange: () => {}, onPickPhoto: () => {} };

describe('FriendForm', () => {
  it('renders every Figma field', async () => {
    await renderWithTheme(<FriendForm {...baseProps} />);
    for (const label of ['Name', 'Last Contact', 'Met at', 'Lives in', 'Birthday', 'Notes']) {
      expect(screen.getByLabelText(label)).toBeOnTheScreen();
    }
    expect(screen.getByText('Contact Frequency')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeOnTheScreen();
  });

  it('reports the whole form with the edited field replaced', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<FriendForm {...baseProps} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText('Name'), 'A');
    expect(onChange).toHaveBeenLastCalledWith({ ...emptyFriendForm(), name: 'A' });

    await userEvent.setup().press(screen.getByRole('radio', { name: 'Weekly' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...emptyFriendForm(), periodicity: 'WEEKLY' });
  });

  it('shows field errors next to their fields', async () => {
    await renderWithTheme(
      <FriendForm {...baseProps} errors={{ name: 'Name is required', birthday: 'Bad date' }} />,
    );
    expect(screen.getByText('Name is required')).toBeOnTheScreen();
    expect(screen.getByText('Bad date')).toBeOnTheScreen();
    expect(screen.getByLabelText('Name')).toHaveProp('accessibilityHint', 'Name is required');
  });

  it('calls onPickPhoto from the photo placeholder', async () => {
    const onPickPhoto = jest.fn();
    await renderWithTheme(<FriendForm {...baseProps} onPickPhoto={onPickPhoto} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add photo' }));
    expect(onPickPhoto).toHaveBeenCalledTimes(1);
  });

  it('focuses the notes field from the "+" next to Notes', async () => {
    // Jest mocks TextInput as a class whose focus() is a shared prototype method.
    const focus = jest.spyOn(TextInput.prototype, 'focus');
    await renderWithTheme(<FriendForm {...baseProps} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add note' }));
    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
  });
});

describeStories('FriendForm', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
