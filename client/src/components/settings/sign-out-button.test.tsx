import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useSignOut } from '@/api/use-sign-out';
import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { SignOutButton } from './sign-out-button';
import * as stories from './sign-out-button.stories';

jest.mock('@/api/use-sign-out');

const mutate = jest.fn();
beforeEach(() => {
  mutate.mockClear();
  jest
    .mocked(useSignOut)
    .mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useSignOut>);
});

it('signs out on press', async () => {
  await renderWithTheme(<SignOutButton />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Sign out' }));
  expect(mutate).toHaveBeenCalledTimes(1);
});

describeStories('SignOutButton', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
