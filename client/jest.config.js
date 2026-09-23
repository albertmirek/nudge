/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  // jest-expo's own list plus Storybook (ESM); setting this key replaces the preset's list.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|jest-expo|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|storybook|@storybook/react|uuid|@react-native/.*)',
  ],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/src/test/mocks/secure-store.ts',
    '^expo-sqlite/kv-store$': '<rootDir>/src/test/mocks/kv-store.ts',
    // Mirror the tsconfig path aliases; the assets rule must come first.
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
