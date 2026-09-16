import { composeStories } from '@storybook/react';
import { act, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

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

  it('loops by one text segment width, not the combined width of both copies', async () => {
    // Stub Animated.loop so `.start()` never schedules a real repeating animation (it ticks
    // every ~16ms for the full duration, well past this test's lifetime) — this test only
    // cares what config TickerBanner passes to Animated.timing, via the untouched real object.
    const loopSpy = jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
    const timingSpy = jest.spyOn(Animated, 'timing');
    await renderWithTheme(<TickerBanner text="hi" />);
    // Measuring the wrapper that holds both copies (instead of a single copy) would make the
    // loop travel the full duplicated width, leaving a visible blank gap before it resets.
    const firstCopy = screen.getAllByText('hi', { includeHiddenElements: true })[0];
    if (!firstCopy) throw new Error('expected at least one "hi" text node');

    await act(() => {
      firstCopy.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 20 } } });
    });

    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: -120 }),
    );

    loopSpy.mockRestore();
    timingSpy.mockRestore();
  });
});

describeStories('TickerBanner', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
