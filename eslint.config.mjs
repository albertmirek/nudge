// Single ESLint configuration for the whole workspace.
// Packages must not carry their own ESLint config; add per-package overrides here.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import expo from 'eslint-config-expo/flat.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/coverage/**',
      'client/ios/**',
      'client/android/**',
      'client/expo-env.d.ts',
      'docs/**',
      '.superpowers/**',
      '.pnpm-store/**',
    ],
  },

  // Shared baseline for every JS/TS file in the repo.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Expo client: React Native rules from Expo's own preset.
  {
    files: ['client/**/*.{js,jsx,ts,tsx}'],
    extends: [expo],
    settings: {
      // Resolve the `@/*` path aliases from client/tsconfig.json when linting from the root.
      'import/resolver': {
        typescript: { project: 'client/tsconfig.json' },
        node: true,
      },
    },
  },

  // NestJS server: type-aware linting against server/tsconfig.json.
  {
    files: ['server/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },

  // Plain Node config/tooling files at the root.
  {
    files: ['*.{js,mjs,cjs}', 'client/*.{js,cjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Must be last: disables stylistic rules that would conflict with Prettier.
  prettier,
);
