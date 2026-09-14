/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  moduleNameMapper: {
    // Mirror the tsconfig path aliases; the assets rule must come first.
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
