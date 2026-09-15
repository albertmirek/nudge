import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ContactRow } from './contact-row';
import * as stories from './contact-row.stories';

const NOW = new Date('2026-09-14T12:00:00Z');
const LAST_CONTACT = new Date('2025-11-30T12:00:00Z'); // 288 days before NOW

const baseProps = {
  name: 'Anastasia Kleisioni',
  lastContactAt: LAST_CONTACT,
  checked: false,
  onCheckedChange: () => {},
  now: NOW,
};

describe('ContactRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the name, avatar and relative date', async () => {
    await renderWithTheme(<ContactRow {...baseProps} />);
    expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen();
    expect(screen.getByText('288 d ago')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Anastasia Kleisioni' })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Select Anastasia Kleisioni' })).toBeOnTheScreen();
  });

  it('shows "Never" when there is no contact history', async () => {
    await renderWithTheme(<ContactRow {...baseProps} lastContactAt={null} />);
    expect(screen.getByText('Never')).toBeOnTheScreen();
  });

  it('truncates long names to one line', async () => {
    await renderWithTheme(<ContactRow {...baseProps} name="Anastasia Kleisioni-Papadopoulou" />);
    expect(screen.getByText('Anastasia Kleisioni-Papadopoulou').props.numberOfLines).toBe(1);
  });

  it('forwards checkbox changes', async () => {
    const onCheckedChange = jest.fn();
    await renderWithTheme(<ContactRow {...baseProps} onCheckedChange={onCheckedChange} />);
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('calls onPress when the profile area is tapped', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<ContactRow {...baseProps} onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Anastasia Kleisioni' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button without onPress', async () => {
    await renderWithTheme(<ContactRow {...baseProps} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describeStories('ContactRow', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
