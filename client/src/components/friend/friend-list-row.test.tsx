import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { FriendListRow } from './friend-list-row';
import * as stories from './friend-list-row.stories';

describe('FriendListRow', () => {
  it('shows the avatar and full name as one pressable row', async () => {
    await renderWithTheme(<FriendListRow name="Anastasia Kleisioni" onPress={() => {}} />);
    expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Anastasia Kleisioni' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Anastasia Kleisioni' })).toBeOnTheScreen();
  });

  it('truncates long names to one line', async () => {
    await renderWithTheme(
      <FriendListRow name="Anastasia Kleisioni-Papadopoulou" onPress={() => {}} />,
    );
    expect(screen.getByText('Anastasia Kleisioni-Papadopoulou').props.numberOfLines).toBe(1);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<FriendListRow name="Aku Koskien" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Aku Koskien' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describeStories('FriendListRow', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
