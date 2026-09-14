import Storage from 'expo-sqlite/kv-store';

import { view } from './storybook.requires';

/** The on-device Storybook UI. Rendered by app/_layout.tsx when EXPO_PUBLIC_STORYBOOK_ENABLED=true. */
const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: (key) => Storage.getItemAsync(key),
    setItem: (key, value) => Storage.setItemAsync(key, value),
  },
});

export default StorybookUIRoot;
