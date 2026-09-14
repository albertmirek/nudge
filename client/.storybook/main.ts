import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'node:path';

// main.ts is loaded as an ES module, so `__dirname` is unavailable.
const configDir = import.meta.dirname;

const main: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: { name: '@storybook/react-native-web-vite', options: {} },
  viteFinal: async (config) => {
    // Keep the framework's aliases (react-native → react-native-web, …) whatever shape they come in.
    const existing = config.resolve?.alias ?? [];
    const existingAliases = Array.isArray(existing)
      ? existing
      : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }));

    return {
      ...config,
      resolve: {
        ...config.resolve,
        // Mirror tsconfig paths (assets first) and RN platform extensions.
        alias: [
          { find: /^@\/assets\//, replacement: `${path.resolve(configDir, '../assets')}/` },
          { find: /^@\//, replacement: `${path.resolve(configDir, '../src')}/` },
          ...existingAliases,
        ],
        extensions: [
          '.web.tsx',
          '.web.ts',
          '.web.jsx',
          '.web.js',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
          '.mjs',
          '.json',
        ],
      },
    };
  },
};

export default main;
