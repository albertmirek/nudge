import type { Preview } from '@storybook/react';

import { withFonts } from './with-fonts';
import { withTheme } from './with-theme';

/** Project annotations shared by on-device Storybook, web Storybook and Jest portable stories. */
const preview: Preview = {
  decorators: [withTheme, withFonts],
  globalTypes: {
    scheme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { scheme: 'system' },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
  },
};

export default preview;
