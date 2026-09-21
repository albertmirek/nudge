import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { sizes } from '@/theme';

import { FriendGridItem } from './friend-grid-item';
import * as stories from './friend-grid-item.stories';

describe('FriendGridItem', () => {
  it('shows a large avatar and the first name, labelled with the full name', async () => {
    await renderWithTheme(<FriendGridItem name="Anastasia Kleisioni" onPress={() => {}} />);
    expect(screen.getByText('Anastasia')).toBeOnTheScreen();
    expect(screen.queryByText('Anastasia Kleisioni')).toBeNull();
    expect(screen.getByRole('image', { name: 'Anastasia Kleisioni' })).toHaveStyle({
      width: sizes.avatarLarge,
      height: sizes.avatarLarge,
    });
    expect(screen.getByRole('button', { name: 'Anastasia Kleisioni' })).toBeOnTheScreen();
  });

  it('truncates the first name to one line', async () => {
    await renderWithTheme(
      <FriendGridItem name="Maximiliana-Alexandrina Popescu" onPress={() => {}} />,
    );
    expect(screen.getByText('Maximiliana-Alexandrina').props.numberOfLines).toBe(1);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<FriendGridItem name="Aku Koskien" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Aku Koskien' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describeStories('FriendGridItem', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
