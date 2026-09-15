import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { TickerBanner } from './ticker-banner';
import * as stories from './ticker-banner.stories';

describe('TickerBanner', () => {
  it('renders the given text', async () => {
    await renderWithTheme(<TickerBanner text="stay in touch with your friends" />);
    // Decorative and hidden from the a11y tree, so queries must opt in to see it.
    expect(
      screen.getAllByText('stay in touch with your friends', { includeHiddenElements: true })
        .length,
    ).toBeGreaterThan(0);
  });

  it('is hidden from screen readers, being purely decorative', async () => {
    await renderWithTheme(<TickerBanner text="stay in touch with your friends" />);
    expect(screen.getByTestId('ticker-banner', { includeHiddenElements: true })).toHaveProp(
      'accessibilityElementsHidden',
      true,
    );
  });
});

describeStories('TickerBanner', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
