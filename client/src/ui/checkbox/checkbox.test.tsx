import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { Checkbox } from '@/ui';

import * as stories from './checkbox.stories';

describe('Checkbox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes checkbox semantics', async () => {
    await renderWithTheme(
      <Checkbox checked={false} onCheckedChange={() => {}} accessibilityLabel="Aku" />,
    );
    const box = screen.getByRole('checkbox', { name: 'Aku' });
    expect(box).not.toBeChecked();
    expect(box).toBeEnabled();
    expect(box).toHaveStyle({ width: 18, height: 18, borderRadius: 2, borderWidth: 1 });
  });

  it('reports the toggled value on press', async () => {
    const onCheckedChange = jest.fn();
    await renderWithTheme(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('reports false when already checked', async () => {
    const onCheckedChange = jest.fn();
    await renderWithTheme(<Checkbox checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByTestId('checkbox-check')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('does nothing when disabled', async () => {
    const onCheckedChange = jest.fn();
    await renderWithTheme(<Checkbox checked={false} disabled onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describeStories('Checkbox', stories);

it('matches the default story snapshot', async () => {
  const { Unchecked } = composeStories(stories);
  expect((await render(<Unchecked />)).toJSON()).toMatchSnapshot();
});
