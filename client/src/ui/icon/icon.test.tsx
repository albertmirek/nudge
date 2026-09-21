import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { lightColors } from '@/theme';
import { Icon } from '@/ui';

import * as stories from './icon.stories';

describe('Icon', () => {
  it('renders the named asset tinted with the primary text colour by default', async () => {
    await renderWithTheme(<Icon name="home" />);
    const icon = screen.getByTestId('icon-home');
    expect(icon).toBeOnTheScreen();
    // expo-image normalizes the tint to a platform colour int.
    expect(icon.props.tintColor).toBe(processColor(lightColors.text.primary));
    expect(icon).toHaveStyle({ width: 22, height: 22 });
  });

  it('accepts a semantic colour and an explicit size', async () => {
    await renderWithTheme(<Icon name="plus" color="secondary" size={32} />);
    const icon = screen.getByTestId('icon-plus');
    expect(icon.props.tintColor).toBe(processColor(lightColors.text.secondary));
    expect(icon).toHaveStyle({ width: 32, height: 32 });
  });

  it('includes the friend-list view toggle icons', async () => {
    await renderWithTheme(
      <>
        <Icon name="grid" />
        <Icon name="list" />
      </>,
    );
    // expo-image resolves a missing asset to an empty source list.
    expect(screen.getByTestId('icon-grid').props.source).not.toHaveLength(0);
    expect(screen.getByTestId('icon-list').props.source).not.toHaveLength(0);
  });
});

describeStories('Icon', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
