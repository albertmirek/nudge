import { composeStories } from '@storybook/react';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { NudgeTabs } from './nudge-tabs';
import * as stories from './nudge-tabs.stories';

const baseProps = {
  value: 'overdue' as const,
  onChange: () => {},
  overdueCount: 3,
};

describe('NudgeTabs', () => {
  it('shows both tabs with the overdue count badge', async () => {
    await renderWithTheme(<NudgeTabs {...baseProps} />);
    expect(screen.getByRole('tab', { name: 'Overdue' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('marks the selected tab', async () => {
    await renderWithTheme(<NudgeTabs {...baseProps} value="upcoming" />);
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Overdue' })).not.toBeSelected();
  });

  it('calls onChange with the tapped tab', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<NudgeTabs {...baseProps} onChange={onChange} />);
    await userEvent.setup().press(screen.getByRole('tab', { name: 'Upcoming' }));
    expect(onChange).toHaveBeenCalledWith('upcoming');
  });

  it('hides the badge when there is nothing overdue', async () => {
    await renderWithTheme(<NudgeTabs {...baseProps} overdueCount={0} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('animates the selection indicator to the tapped tab', async () => {
    jest.useFakeTimers();
    const { rerender } = await renderWithTheme(<NudgeTabs {...baseProps} />);
    const indicator = screen.getByTestId('nudge-tabs-indicator');
    expect(indicator).toBeOnTheScreen();

    await rerender(<NudgeTabs {...baseProps} value="upcoming" />);
    await act(() => jest.advanceTimersByTime(250));

    // Re-renders without crashing and keeps the same indicator mounted (not remounted per tab).
    expect(screen.getByTestId('nudge-tabs-indicator')).toBe(indicator);
    jest.useRealTimers();
  });
});

describeStories('NudgeTabs', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
