import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { IconButton } from '@/ui';

import * as stories from './icon-button.stories';

describe('IconButton', () => {
  it('is a labelled button showing the icon', async () => {
    await renderWithTheme(
      <IconButton icon="plus" accessibilityLabel="Add note" onPress={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Add note' })).toBeEnabled();
    expect(screen.getByTestId('icon-plus')).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <IconButton icon="camera" accessibilityLabel="Add photo" onPress={onPress} />,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add photo' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <IconButton icon="plus" accessibilityLabel="Add note" onPress={onPress} disabled />,
    );
    expect(screen.getByRole('button', { name: 'Add note' })).toBeDisabled();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add note' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sizes the raised large variant to the photo placeholder', async () => {
    await renderWithTheme(
      <IconButton
        icon="camera"
        variant="raised"
        size="lg"
        accessibilityLabel="Add photo"
        onPress={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add photo' })).toHaveStyle({
      width: 80,
      height: 80,
      borderRadius: 9999,
    });
  });
});

describeStories('IconButton', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
