import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { Button } from '@/ui';

import * as stories from './button.stories';

describe('Button', () => {
  it('exposes button semantics with its label as the name', async () => {
    await renderWithTheme(<Button label="Save" onPress={() => {}} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Save" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Save" onPress={onPress} disabled />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the label and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Save" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describeStories('Button', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
