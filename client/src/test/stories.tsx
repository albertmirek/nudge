import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';

import { mockSystemScheme } from '@/test/setup';

type CsfModule = Parameters<typeof composeStories>[0];

/**
 * One render test per story per colour scheme. The `withTheme` decorator resolves `system`
 * through the (mocked) OS scheme, so flipping the mock flips the theme.
 */
export function describeStories(name: string, csf: CsfModule): void {
  // `composeStories` is generic over the module; the entries are all renderable components.
  const stories = Object.entries(composeStories(csf)) as [string, ComponentType][];

  describe.each(['light', 'dark'] as const)(`${name} stories (%s)`, (scheme) => {
    beforeEach(() => mockSystemScheme(scheme));

    it.each(stories)('renders %s', async (_storyName, Story) => {
      await render(<Story />);
      expect(screen.toJSON()).not.toBeNull();
    });
  });
}
