import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { PasswordInput } from './password-input';
import * as stories from './password-input.stories';

it('hides the text until Show is pressed', async () => {
  await renderWithTheme(
    <PasswordInput label="Password" value="hunter22" onChangeText={() => {}} />,
  );
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', false);
  expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
});

it('forwards errors to the input', async () => {
  await renderWithTheme(
    <PasswordInput label="Password" value="" onChangeText={() => {}} error="Enter your password" />,
  );
  expect(screen.getByText('Enter your password')).toBeOnTheScreen();
});

describeStories('PasswordInput', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
