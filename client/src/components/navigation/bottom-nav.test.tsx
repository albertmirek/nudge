import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { BottomNav, TAB_ROUTES } from './bottom-nav';
import * as stories from './bottom-nav.stories';

describe('BottomNav', () => {
  it('shows the three Figma tabs in order: friend book, add a friend, home', async () => {
    await renderWithTheme(<BottomNav active="index" onNavigate={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Friend book',
      'Add a friend',
      'Home',
    ]);
    expect(TAB_ROUTES).toEqual(['friends', 'create-friend', 'index']);
  });

  it('marks the active route as selected', async () => {
    await renderWithTheme(<BottomNav active="create-friend" onNavigate={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Add a friend' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Home' })).not.toBeSelected();
  });

  it('reports the tapped route', async () => {
    const onNavigate = jest.fn();
    await renderWithTheme(<BottomNav active="index" onNavigate={onNavigate} />);
    await userEvent.setup().press(screen.getByRole('tab', { name: 'Friend book' }));
    expect(onNavigate).toHaveBeenCalledWith('friends');
  });
});

describeStories('BottomNav', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
