import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { TextLink } from './text-link';
import * as stories from './text-link.stories';

it('is a link that calls onPress', async () => {
  const onPress = jest.fn();
  await renderWithTheme(<TextLink label="Forgot password?" onPress={onPress} />);
  await userEvent.setup().press(screen.getByRole('link', { name: 'Forgot password?' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

describeStories('TextLink', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
