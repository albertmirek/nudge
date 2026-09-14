// Metro configuration for a pnpm monorepo (hoisted node_modules).
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so changes in shared packages trigger rebuilds.
config.watchFolders = [workspaceRoot];
// Resolve modules from the app first, then from the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

// Storybook is only bundled when the flag is set; otherwise its imports become empty modules.
module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  configPath: path.resolve(projectRoot, '.rnstorybook'),
});
