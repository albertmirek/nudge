import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { createMemoryThemeStorage } from '@/theme';

import { ThemeModePicker } from './theme-mode-picker';
import * as stories from './theme-mode-picker.stories';

describe('ThemeModePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks the current mode as selected', async () => {
    await renderWithTheme(<ThemeModePicker />, { scheme: 'dark' });
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeSelected();
  });

  it('persists the tapped mode', async () => {
    const storage = createMemoryThemeStorage();
    await renderWithTheme(<ThemeModePicker />, { storage });
    await userEvent.setup().press(screen.getByRole('radio', { name: 'System' }));
    expect(storage.get()).toBe('system');
    expect(screen.getByRole('radio', { name: 'System' })).toBeSelected();
  });
});

describeStories('ThemeModePicker', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
