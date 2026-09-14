# Client Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `@nudge/client` typed design tokens, a persisted light/dark `ThemeProvider`, Storybook (on-device + web) fed by one set of stories, a Jest test setup, and the first Figma component (`ContactRow`) with the three primitives it composes (`Text`, `Avatar`, `Checkbox`).

**Architecture:** Plain React Native `StyleSheet` + typed tokens delivered through React Context (`src/theme/`). Generic primitives live in `src/ui/`, app-specific compositions in `src/components/`; every component folder holds `component.tsx`, `component.stories.tsx`, `component.test.tsx`. Stories are CSF3 and are reused in Jest through Storybook portable stories (`composeStories`), so every story is automatically a render test in light and dark.

**Tech Stack:** Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript 6 / expo-router; `@storybook/react-native` 10.6 (on-device) + `@storybook/react-native-web-vite` 10.6 (browser); `jest-expo` 57 + `@testing-library/react-native` 14; `expo-sqlite/kv-store` for persistence; `@tanstack/react-query` 5 (provider only); `@expo-google-fonts/inter`.

**Spec:** `docs/superpowers/specs/2026-09-14-design-system-foundation-design.md`

## Global Constraints

- Monorepo: pnpm 11.23 (`nodeLinker: hoisted`), Node >= 22. Run every command from the repo root. The worktree has no `node_modules` yet — Task 1 installs.
- Add Expo-ecosystem packages with `pnpm --filter @nudge/client exec expo install <pkg>` so versions match SDK 57; add everything else with `pnpm --filter @nudge/client add [-D] <pkg>`. Use `CI=1` in front of `pnpm add`/`pnpm install` to skip prompts.
- ESLint and Prettier live only at the root (`eslint.config.mjs`, `.prettierrc`: single quotes, semicolons, trailing commas, print width 100). `pnpm lint` and `pnpm format:check` must pass before every commit (husky runs lint-staged on staged files).
- `tsconfig.base.json` sets `strict` and `noUncheckedIndexedAccess`. `pnpm typecheck` must pass at the end of every task.
- Path aliases: `@/*` → `client/src/*`, `@/assets/*` → `client/assets/*` (see `client/tsconfig.json`). Jest and Vite must mirror both, `@/assets` first.
- Components never contain colour/size literals; they read `useTheme()` / `useStyles()`.
- Dark colour values are placeholders (no dark Figma design). Keys must equal the light keys.
- Only `ContactRow` + `Text`, `Avatar`, `Checkbox`. No other Figma components.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QTq6hfSmYf7DFXfbvq2i49
  ```

## File map

| Path (under `client/`) | Responsibility |
| --- | --- |
| `jest.config.js` | jest-expo preset, alias mapping, storybook transpile list, kv-store mock |
| `src/test/setup.ts` | Jest setup: mocks `useSystemColorScheme`, registers Storybook project annotations |
| `src/test/mocks/kv-store.ts` | In-memory stand-in for `expo-sqlite/kv-store` |
| `src/test/render.tsx` | `renderWithTheme(ui, { scheme })` for non-story tests |
| `src/test/stories.tsx` | `describeStories(name, csf)` — renders every story in light and dark |
| `src/lib/date.ts` | `formatDaysAgo` |
| `src/theme/tokens/{colors,spacing,typography,radii}.ts` | Raw + semantic tokens |
| `src/theme/theme.ts` | `Theme` type, `lightTheme`, `darkTheme`, `themes` |
| `src/theme/theme-mode.ts` | `ThemeMode`, `ThemeStorage` interface, `parseThemeMode`, `createMemoryThemeStorage` |
| `src/theme/theme-storage.ts` / `.web.ts` | Default persistent storage (kv-store / localStorage) |
| `src/theme/use-system-color-scheme.ts` | Wraps RN `useColorScheme`, normalises to `'light' \| 'dark'` (mocked in tests) |
| `src/theme/theme-provider.tsx` | `ThemeProvider`, `useTheme`, `useThemeMode` |
| `src/theme/use-styles.ts` | `useStyles(makeStyles)` |
| `src/theme/index.ts` | Barrel |
| `src/types/assets.d.ts` | `*.svg` module declaration |
| `src/ui/text/`, `src/ui/avatar/`, `src/ui/checkbox/`, `src/ui/index.ts` | Primitives |
| `src/components/contact/contact-row.*` | Figma `contact` |
| `src/components/settings/theme-mode-picker.*` | System/Light/Dark switch used by the demo screen |
| `src/storybook/preview.tsx`, `with-theme.tsx`, `with-fonts.tsx`, `with-fonts.web.tsx` | Shared Storybook annotations |
| `.rnstorybook/{main.ts,preview.tsx,index.tsx,storybook.requires.ts}` | On-device Storybook |
| `.storybook/{main.ts,preview.tsx,preview-head.html}` | Web Storybook |
| `assets/icons/checkbox-check.svg` | Figma export (checked state) |
| `src/app/_layout.tsx`, `src/app/index.tsx` | App shell (providers, Storybook toggle) and Contacts demo screen |

---

### Task 1: Jest foundation + `formatDaysAgo`

**Files:**
- Modify: `client/package.json` (scripts + devDependencies)
- Create: `client/jest.config.js`
- Create: `client/src/test/setup.ts`
- Create: `client/src/lib/date.ts`
- Test: `client/src/lib/date.test.ts`

**Interfaces:**
- Produces: `formatDaysAgo(date: Date, now?: Date): string` and `daysBetween(date: Date, now: Date): number` from `@/lib/date`.

- [ ] **Step 1: Install the workspace and the test dependencies**

```bash
CI=1 pnpm install
CI=1 pnpm --filter @nudge/client add -D jest@~29.7.0 jest-expo@~57.0.5 @testing-library/react-native@^14.0.1 test-renderer@^1.2.0 @types/jest@^29.5.14
```

- [ ] **Step 2: Add the test script and Jest config**

In `client/package.json` add to `"scripts"`:

```json
"test": "jest"
```

Create `client/jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  moduleNameMapper: {
    // Mirror the tsconfig path aliases; the assets rule must come first.
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

Create `client/src/test/setup.ts` (grows in later tasks):

```ts
// Jest setup shared by every test file (see jest.config.js `setupFilesAfterEnv`).
export {};
```

- [ ] **Step 3: Write the failing test**

`client/src/lib/date.test.ts`:

```ts
import { daysBetween, formatDaysAgo } from '@/lib/date';

const NOW = new Date('2026-09-14T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe('daysBetween', () => {
  it('counts whole days elapsed', () => {
    expect(daysBetween(daysAgo(288), NOW)).toBe(288);
  });

  it('floors partial days', () => {
    expect(daysBetween(new Date(NOW.getTime() - 36 * 60 * 60 * 1000), NOW)).toBe(1);
  });

  it('never goes negative for future dates', () => {
    expect(daysBetween(daysAgo(-3), NOW)).toBe(0);
  });
});

describe('formatDaysAgo', () => {
  it('renders "today" for the same day', () => {
    expect(formatDaysAgo(NOW, NOW)).toBe('today');
  });

  it('renders "{n} d ago" otherwise', () => {
    expect(formatDaysAgo(daysAgo(1), NOW)).toBe('1 d ago');
    expect(formatDaysAgo(daysAgo(288), NOW)).toBe('288 d ago');
  });

  it('defaults `now` to the current time', () => {
    expect(formatDaysAgo(new Date())).toBe('today');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/lib/date.test.ts`
Expected: FAIL — `Cannot find module '@/lib/date'`.

- [ ] **Step 5: Implement `date.ts`**

`client/src/lib/date.ts`:

```ts
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days elapsed from `date` to `now`; never negative. */
export function daysBetween(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY));
}

/** "today" for the same day, otherwise "{n} d ago" — the label used in contact lists. */
export function formatDaysAgo(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);
  return days === 0 ? 'today' : `${days} d ago`;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/lib/date.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Verify the root wiring, lint and types**

Run: `pnpm test` (root — runs server vitest and client jest), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`.
Expected: all pass. If `pnpm typecheck` complains about `describe`/`expect` globals, `@types/jest` was not picked up — check it is in `client/package.json` devDependencies.

- [ ] **Step 8: Commit**

```bash
git add client/package.json client/jest.config.js client/src/test/setup.ts client/src/lib pnpm-lock.yaml
git commit -m "feat(client): add jest-expo test setup and formatDaysAgo"
```

---

### Task 2: Design tokens and theme objects

**Files:**
- Create: `client/src/theme/tokens/colors.ts`, `spacing.ts`, `typography.ts`, `radii.ts`
- Create: `client/src/theme/theme.ts`
- Test: `client/src/theme/theme.test.ts`

**Interfaces:**
- Produces:
  - `palette` (raw hex), `SemanticColors`, `lightColors`, `darkColors` from `@/theme/tokens/colors`
  - `spacing` (`{0:0,1:4,2:8,3:12,4:16,5:24,6:32}`), `radii` (`{sm:2, md:8, full:9999}`)
  - `typography: Record<TypographyVariant, TextStyle>`, `TypographyVariant = 'title' | 'body' | 'bodyLight' | 'caption'`
  - `type ColorScheme = 'light' | 'dark'`, `type Theme`, `lightTheme`, `darkTheme`, `themes: Record<ColorScheme, Theme>` from `@/theme/theme`

- [ ] **Step 1: Write the failing test**

`client/src/theme/theme.test.ts`:

```ts
import { darkTheme, lightTheme, themes } from '@/theme/theme';

/** Sorted dotted key paths of a nested object, e.g. ["text.primary", "background"]. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

const HEX = /^#[0-9a-f]{6}$/;

describe('themes', () => {
  it('light and dark expose the same semantic colour keys', () => {
    expect(keyPaths(darkTheme.colors)).toEqual(keyPaths(lightTheme.colors));
  });

  it('every colour is a lowercase 6-digit hex', () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const path of keyPaths(theme.colors)) {
        const value = path.split('.').reduce<unknown>((acc, key) => {
          return (acc as Record<string, unknown>)[key];
        }, theme.colors);
        expect(value).toMatch(HEX);
      }
    }
  });

  it('is keyed by scheme', () => {
    expect(themes.light).toBe(lightTheme);
    expect(themes.dark).toBe(darkTheme);
    expect(lightTheme.scheme).toBe('light');
    expect(darkTheme.scheme).toBe('dark');
  });

  it('uses the Figma text colour and accent in light mode', () => {
    expect(lightTheme.colors.text.primary).toBe('#151518');
    expect(lightTheme.colors.accent).toBe('#3a448a');
    expect(lightTheme.colors.border).toBe('#cfcfcf');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/theme/theme.test.ts`
Expected: FAIL — `Cannot find module '@/theme/theme'`.

- [ ] **Step 3: Create the token files**

`client/src/theme/tokens/colors.ts`:

```ts
/**
 * Raw palette. Never use these in components — go through the semantic colours below,
 * which are what switch between light and dark.
 */
export const palette = {
  white: '#ffffff',
  offWhite: '#f8f8f8',
  gray100: '#f0f0f3',
  gray300: '#cfcfcf',
  gray500: '#8a8a8f',
  gray700: '#3a3a3f',
  gray800: '#212225',
  ink900: '#151518',
  indigo400: '#6a74b8',
  indigo600: '#3a448a',
} as const;

export type SemanticColors = {
  text: {
    primary: string;
    secondary: string;
  };
  background: string;
  surface: string;
  border: string;
  accent: string;
  onAccent: string;
};

/** Values taken from the Figma file (Sendy-personal, "Components" section). */
export const lightColors: SemanticColors = {
  text: {
    primary: palette.ink900,
    secondary: palette.gray500,
  },
  background: palette.white,
  surface: palette.gray100,
  border: palette.gray300,
  accent: palette.indigo600,
  onAccent: palette.offWhite,
};

/** Placeholder values until a dark design exists in Figma. Keys must mirror `lightColors`. */
export const darkColors: SemanticColors = {
  text: {
    primary: palette.offWhite,
    secondary: palette.gray300,
  },
  background: palette.ink900,
  surface: palette.gray800,
  border: palette.gray700,
  accent: palette.indigo400,
  onAccent: palette.offWhite,
};
```

`client/src/theme/tokens/spacing.ts`:

```ts
/** 4-pt spacing scale: step → px. `theme.spacing[2]` is 8px. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
} as const;

export type SpacingStep = keyof typeof spacing;
```

`client/src/theme/tokens/radii.ts`:

```ts
export const radii = {
  sm: 2,
  md: 8,
  full: 9999,
} as const;
```

`client/src/theme/tokens/typography.ts`:

```ts
import { Platform, type TextStyle } from 'react-native';

/**
 * Inter is loaded with expo-font under one family name per weight (native) and as a single
 * CSS family with weights (web). Never combine `fontWeight` with a per-weight family on iOS —
 * it falls back to the system font.
 */
function inter(nativeFamily: string, weight: NonNullable<TextStyle['fontWeight']>): TextStyle {
  return Platform.select<TextStyle>({
    web: { fontFamily: 'Inter', fontWeight: weight },
    default: { fontFamily: nativeFamily },
  });
}

export const fontFamilies = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
} as const;

export type TypographyVariant = 'title' | 'body' | 'bodyLight' | 'caption';

export const typography: Record<TypographyVariant, TextStyle> = {
  /** Screen headline ("Your friend list"). */
  title: { ...inter(fontFamilies.semiBold, '600'), fontSize: 28, lineHeight: 36 },
  /** Default reading size — contact name (Figma: Inter Regular 15). */
  body: { ...inter(fontFamilies.regular, '400'), fontSize: 15, lineHeight: 20 },
  /** Secondary meta text — "288 d ago" (Figma: Inter Light 12). */
  bodyLight: { ...inter(fontFamilies.light, '300'), fontSize: 12, lineHeight: 16 },
  caption: { ...inter(fontFamilies.regular, '400'), fontSize: 12, lineHeight: 16 },
};
```

- [ ] **Step 4: Create `theme.ts`**

`client/src/theme/theme.ts`:

```ts
import { darkColors, lightColors, type SemanticColors } from './tokens/colors';
import { radii } from './tokens/radii';
import { spacing } from './tokens/spacing';
import { typography } from './tokens/typography';

export type ColorScheme = 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  colors: SemanticColors;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  typography,
  radii,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  spacing,
  typography,
  radii,
};

export const themes: Record<ColorScheme, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/theme/theme.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/src/theme
git commit -m "feat(client): add design tokens and light/dark theme objects"
```

---

### Task 3: Theme mode persistence

**Files:**
- Create: `client/src/theme/theme-mode.ts`
- Create: `client/src/theme/theme-storage.ts`
- Create: `client/src/theme/theme-storage.web.ts`
- Create: `client/src/test/mocks/kv-store.ts`
- Modify: `client/jest.config.js` (moduleNameMapper)
- Test: `client/src/theme/theme-mode.test.ts`, `client/src/theme/theme-storage.test.ts`

**Interfaces:**
- Produces (from `@/theme/theme-mode`):
  - `type ThemeMode = 'system' | 'light' | 'dark'`, `THEME_MODES`, `THEME_MODE_STORAGE_KEY = 'nudge.theme.mode'`
  - `parseThemeMode(value: string | null | undefined): ThemeMode | null`
  - `interface ThemeStorage { get(): ThemeMode | null; set(mode: ThemeMode): void }`
  - `createMemoryThemeStorage(initial?: ThemeMode | null): ThemeStorage`
- Produces (from `@/theme/theme-storage`): `createDefaultThemeStorage(): ThemeStorage` — native uses `expo-sqlite/kv-store`, web uses `localStorage`.

- [ ] **Step 1: Install expo-sqlite**

```bash
CI=1 pnpm --filter @nudge/client exec expo install expo-sqlite
```

Note for the user: `expo-sqlite` is a native module — an existing dev-client build must be rebuilt (`expo run:ios` / `expo run:android`) before the app runs on device again. Expo Go already includes it.

- [ ] **Step 2: Write the failing tests**

`client/src/theme/theme-mode.test.ts`:

```ts
import { createMemoryThemeStorage, parseThemeMode } from '@/theme/theme-mode';

describe('parseThemeMode', () => {
  it.each(['system', 'light', 'dark'] as const)('accepts %s', (mode) => {
    expect(parseThemeMode(mode)).toBe(mode);
  });

  it('rejects anything else', () => {
    expect(parseThemeMode('blue')).toBeNull();
    expect(parseThemeMode('')).toBeNull();
    expect(parseThemeMode(null)).toBeNull();
    expect(parseThemeMode(undefined)).toBeNull();
  });
});

describe('createMemoryThemeStorage', () => {
  it('starts empty by default', () => {
    expect(createMemoryThemeStorage().get()).toBeNull();
  });

  it('returns what was set', () => {
    const storage = createMemoryThemeStorage('light');
    expect(storage.get()).toBe('light');
    storage.set('dark');
    expect(storage.get()).toBe('dark');
  });
});
```

`client/src/theme/theme-storage.test.ts` (runs against the Jest kv-store mock mapped in Step 4):

```ts
import Storage from 'expo-sqlite/kv-store';

import { THEME_MODE_STORAGE_KEY } from '@/theme/theme-mode';
import { createDefaultThemeStorage } from '@/theme/theme-storage';

beforeEach(() => {
  Storage.clearSync();
});

describe('createDefaultThemeStorage (native)', () => {
  it('reads null when nothing is stored', () => {
    expect(createDefaultThemeStorage().get()).toBeNull();
  });

  it('persists the mode under the storage key', () => {
    createDefaultThemeStorage().set('dark');
    expect(Storage.getItemSync(THEME_MODE_STORAGE_KEY)).toBe('dark');
    expect(createDefaultThemeStorage().get()).toBe('dark');
  });

  it('ignores corrupt stored values', () => {
    Storage.setItemSync(THEME_MODE_STORAGE_KEY, 'purple');
    expect(createDefaultThemeStorage().get()).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @nudge/client test -- src/theme/theme-mode.test.ts src/theme/theme-storage.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Add the kv-store Jest mock and map it**

`client/src/test/mocks/kv-store.ts`:

```ts
/** In-memory replacement for `expo-sqlite/kv-store` (a native module) in Jest. */
const store = new Map<string, string>();

const Storage = {
  getItemSync: (key: string): string | null => store.get(key) ?? null,
  setItemSync: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItemSync: (key: string): boolean => store.delete(key),
  clearSync: (): boolean => {
    store.clear();
    return true;
  },
  getItemAsync: async (key: string): Promise<string | null> => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  },
};

export default Storage;
```

In `client/jest.config.js`, extend `moduleNameMapper` (keep the alias rules; add this line **before** them):

```js
    '^expo-sqlite/kv-store$': '<rootDir>/src/test/mocks/kv-store.ts',
```

- [ ] **Step 5: Implement `theme-mode.ts` and the two storage adapters**

`client/src/theme/theme-mode.ts`:

```ts
export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_MODE_STORAGE_KEY = 'nudge.theme.mode';

export function parseThemeMode(value: string | null | undefined): ThemeMode | null {
  return THEME_MODES.find((mode) => mode === value) ?? null;
}

/** Where the user's theme choice lives. Implementations are synchronous so the first render already knows the mode. */
export interface ThemeStorage {
  get(): ThemeMode | null;
  set(mode: ThemeMode): void;
}

/** Non-persistent storage for tests and Storybook. */
export function createMemoryThemeStorage(initial: ThemeMode | null = null): ThemeStorage {
  let current = initial;
  return {
    get: () => current,
    set: (mode) => {
      current = mode;
    },
  };
}
```

`client/src/theme/theme-storage.ts` (native):

```ts
import Storage from 'expo-sqlite/kv-store';

import { THEME_MODE_STORAGE_KEY, parseThemeMode, type ThemeStorage } from './theme-mode';

/** Persists the theme mode in expo-sqlite's key-value store. */
export function createDefaultThemeStorage(): ThemeStorage {
  return {
    get: () => parseThemeMode(Storage.getItemSync(THEME_MODE_STORAGE_KEY)),
    set: (mode) => Storage.setItemSync(THEME_MODE_STORAGE_KEY, mode),
  };
}
```

`client/src/theme/theme-storage.web.ts`:

```ts
import { THEME_MODE_STORAGE_KEY, parseThemeMode, type ThemeStorage } from './theme-mode';

/** Persists the theme mode in localStorage; tolerates environments where it throws (SSR, privacy modes). */
export function createDefaultThemeStorage(): ThemeStorage {
  return {
    get: () => {
      try {
        return parseThemeMode(globalThis.localStorage?.getItem(THEME_MODE_STORAGE_KEY));
      } catch {
        return null;
      }
    },
    set: (mode) => {
      try {
        globalThis.localStorage?.setItem(THEME_MODE_STORAGE_KEY, mode);
      } catch {
        // Best effort: the in-memory mode still applies for this session.
      }
    },
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @nudge/client test -- src/theme`
Expected: PASS.

- [ ] **Step 7: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/package.json pnpm-lock.yaml client/jest.config.js client/src/test/mocks client/src/theme
git commit -m "feat(client): add persisted theme mode storage adapters"
```

---

### Task 4: `ThemeProvider`, hooks and `useStyles`

**Files:**
- Create: `client/src/theme/use-system-color-scheme.ts`
- Create: `client/src/theme/theme-provider.tsx`
- Create: `client/src/theme/use-styles.ts`
- Create: `client/src/theme/index.ts`
- Create: `client/src/test/render.tsx`
- Modify: `client/src/test/setup.ts`
- Test: `client/src/theme/theme-provider.test.tsx`, `client/src/theme/use-styles.test.tsx`

**Interfaces:**
- Produces (from `@/theme`):
  - `useSystemColorScheme(): ColorScheme`
  - `ThemeProvider({ children, storage?, initialMode? })` — `storage` defaults to `createDefaultThemeStorage()`; `initialMode` overrides the stored value (Storybook uses it).
  - `useTheme(): Theme`
  - `useThemeMode(): { mode: ThemeMode; scheme: ColorScheme; setMode(mode: ThemeMode): void }`
  - `useStyles<T>(makeStyles: (theme: Theme) => T): T` — `makeStyles` must be a module-level function (stable identity) so memoisation works.
  - re-exports of everything from `theme.ts`, `theme-mode.ts`, `tokens/*`.
- Produces (from `@/test/render`): `renderWithTheme(ui, { scheme?: ColorScheme, storage?: ThemeStorage })`.
- Test setup mocks `@/theme/use-system-color-scheme`; tests change it with `mockSystemScheme('dark')` from `@/test/setup`.

- [ ] **Step 1: Write the failing tests**

`client/src/theme/theme-provider.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { mockSystemScheme } from '@/test/setup';
import { ThemeProvider, createMemoryThemeStorage, useTheme, useThemeMode } from '@/theme';

function Probe() {
  const theme = useTheme();
  const { mode, scheme } = useThemeMode();
  return <Text>{`${mode}/${scheme}/${theme.colors.background}`}</Text>;
}

let setModeFromOutside: ((mode: 'system' | 'light' | 'dark') => void) | undefined;

function Capture() {
  setModeFromOutside = useThemeMode().setMode;
  return null;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    setModeFromOutside = undefined;
  });

  it('defaults to system and follows the OS scheme', () => {
    mockSystemScheme('dark');
    render(
      <ThemeProvider storage={createMemoryThemeStorage()}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('system/dark/#151518')).toBeOnTheScreen();
  });

  it('restores a persisted mode on mount', () => {
    mockSystemScheme('light');
    render(
      <ThemeProvider storage={createMemoryThemeStorage('dark')}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('dark/dark/#151518')).toBeOnTheScreen();
  });

  it('persists and applies setMode', () => {
    mockSystemScheme('light');
    const storage = createMemoryThemeStorage();
    render(
      <ThemeProvider storage={storage}>
        <Probe />
        <Capture />
      </ThemeProvider>,
    );
    act(() => setModeFromOutside?.('dark'));
    expect(storage.get()).toBe('dark');
    expect(screen.getByText('dark/dark/#151518')).toBeOnTheScreen();
  });

  it('lets initialMode override storage', () => {
    render(
      <ThemeProvider storage={createMemoryThemeStorage('dark')} initialMode="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('light/light/#ffffff')).toBeOnTheScreen();
  });

  it('throws when hooks are used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('ThemeProvider');
  });
});
```

`client/src/theme/use-styles.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { renderWithTheme } from '@/test/render';
import { type Theme, useStyles } from '@/theme';

const makeStyles = (theme: Theme) => ({
  box: { backgroundColor: theme.colors.background, padding: theme.spacing[2] },
});

function Box() {
  const styles = useStyles(makeStyles);
  return <View testID="box" style={styles.box} />;
}

describe('useStyles', () => {
  it('builds styles from the light theme', () => {
    renderWithTheme(<Box />, { scheme: 'light' });
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: '#ffffff', padding: 8 });
  });

  it('builds styles from the dark theme', () => {
    renderWithTheme(<Box />, { scheme: 'dark' });
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: '#151518', padding: 8 });
  });

  it('is unusable outside ThemeProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Box />)).toThrow('ThemeProvider');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @nudge/client test -- src/theme`
Expected: FAIL — `@/theme`, `@/test/render`, `mockSystemScheme` missing.

- [ ] **Step 3: Implement the system-scheme hook, provider and `useStyles`**

`client/src/theme/use-system-color-scheme.ts`:

```ts
import { useColorScheme } from 'react-native';

import type { ColorScheme } from './theme';

/** The OS colour scheme, normalised to light/dark. Mocked in tests (see src/test/setup.ts). */
export function useSystemColorScheme(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}
```

`client/src/theme/theme-provider.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { type ColorScheme, type Theme, themes } from './theme';
import { type ThemeMode, type ThemeStorage } from './theme-mode';
import { createDefaultThemeStorage } from './theme-storage';
import { useSystemColorScheme } from './use-system-color-scheme';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  scheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: ReactNode;
  /** Where the chosen mode is persisted. Defaults to the platform store; tests and Storybook inject memory storage. */
  storage?: ThemeStorage;
  /** Overrides the stored mode for the initial render (Storybook toolbar). */
  initialMode?: ThemeMode;
};

export function ThemeProvider({ children, storage, initialMode }: ThemeProviderProps) {
  const [store] = useState(() => storage ?? createDefaultThemeStorage());
  // Read synchronously so the very first frame already uses the persisted mode (no light→dark flash).
  const [mode, setModeState] = useState<ThemeMode>(() => initialMode ?? store.get() ?? 'system');
  const systemScheme = useSystemColorScheme();
  const scheme: ColorScheme = mode === 'system' ? systemScheme : mode;

  const setMode = useCallback(
    (next: ThemeMode) => {
      store.set(next);
      setModeState(next);
    },
    [store],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[scheme], mode, scheme, setMode }),
    [scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme/useThemeMode must be used inside a ThemeProvider');
  }
  return context;
}

/** The resolved theme (tokens for the active scheme). */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** The user's mode preference plus the resolved scheme; use `setMode` from settings UI. */
export function useThemeMode(): Pick<ThemeContextValue, 'mode' | 'scheme' | 'setMode'> {
  const { mode, scheme, setMode } = useThemeContext();
  return { mode, scheme, setMode };
}
```

`client/src/theme/use-styles.ts`:

```ts
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { Theme } from './theme';
import { useTheme } from './theme-provider';

/**
 * Builds a StyleSheet from the current theme, memoised per theme.
 * Define `makeStyles` at module level so its identity is stable across renders.
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(makeStyles: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(makeStyles(theme)), [makeStyles, theme]);
}
```

`client/src/theme/index.ts`:

```ts
export * from './theme';
export * from './theme-mode';
export { ThemeProvider, useTheme, useThemeMode, type ThemeProviderProps } from './theme-provider';
export { useStyles } from './use-styles';
export { useSystemColorScheme } from './use-system-color-scheme';
export * from './tokens/colors';
export * from './tokens/radii';
export * from './tokens/spacing';
export * from './tokens/typography';
```

- [ ] **Step 4: Add the test helpers**

Replace `client/src/test/setup.ts` with:

```ts
import { useSystemColorScheme } from '@/theme/use-system-color-scheme';
import type { ColorScheme } from '@/theme/theme';

// The OS scheme is not observable in Jest; tests pick one with `mockSystemScheme`.
jest.mock('@/theme/use-system-color-scheme', () => ({
  useSystemColorScheme: jest.fn((): ColorScheme => 'light'),
}));

export function mockSystemScheme(scheme: ColorScheme): void {
  jest.mocked(useSystemColorScheme).mockReturnValue(scheme);
}

beforeEach(() => {
  mockSystemScheme('light');
});
```

`client/src/test/render.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { type ColorScheme, ThemeProvider, type ThemeStorage, createMemoryThemeStorage } from '@/theme';

type Options = RenderOptions & {
  scheme?: ColorScheme;
  storage?: ThemeStorage;
};

/** Renders `ui` inside a ThemeProvider with in-memory storage, forced to `scheme` (default light). */
export function renderWithTheme(
  ui: ReactElement,
  { scheme = 'light', storage = createMemoryThemeStorage(), ...options }: Options = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider storage={storage} initialMode={scheme}>
        {children}
      </ThemeProvider>
    ),
    ...options,
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @nudge/client test -- src/theme`
Expected: PASS (theme, theme-mode, theme-storage, theme-provider, use-styles).

- [ ] **Step 6: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/src/theme client/src/test
git commit -m "feat(client): add ThemeProvider, theme hooks and useStyles"
```

---

### Task 5: `Text` primitive

**Files:**
- Create: `client/src/ui/text/text.tsx`
- Create: `client/src/ui/index.ts`
- Test: `client/src/ui/text/text.test.tsx`

**Interfaces:**
- Produces: `Text` from `@/ui` with `TextProps = RNTextProps & { variant?: TypographyVariant; color?: 'primary' | 'secondary' }`. Defaults: `variant="body"`, `color="primary"`.

- [ ] **Step 1: Write the failing test**

`client/src/ui/text/text.test.tsx`:

```tsx
import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { Text } from '@/ui';

describe('Text', () => {
  it('renders body/primary by default', () => {
    renderWithTheme(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({ fontSize: 15, color: '#151518' });
  });

  it('applies the variant and colour tokens', () => {
    renderWithTheme(
      <Text variant="bodyLight" color="secondary">
        Meta
      </Text>,
    );
    expect(screen.getByText('Meta')).toHaveStyle({ fontSize: 12, color: '#8a8a8f' });
  });

  it('follows the dark theme', () => {
    renderWithTheme(<Text>Hello</Text>, { scheme: 'dark' });
    expect(screen.getByText('Hello')).toHaveStyle({ color: '#f8f8f8' });
  });

  it('lets callers append styles and pass Text props through', () => {
    renderWithTheme(
      <Text numberOfLines={1} style={{ textAlign: 'right' }}>
        Hello
      </Text>,
    );
    const node = screen.getByText('Hello');
    expect(node).toHaveStyle({ textAlign: 'right', fontSize: 15 });
    expect(node.props.numberOfLines).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/ui/text`
Expected: FAIL — `Cannot find module '@/ui'`.

- [ ] **Step 3: Implement `Text`**

`client/src/ui/text/text.tsx`:

```tsx
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type SemanticColors, type TypographyVariant, useTheme } from '@/theme';

export type TextColor = keyof SemanticColors['text'];

export type TextProps = RNTextProps & {
  /** Typography preset from the theme. */
  variant?: TypographyVariant;
  /** Semantic text colour from the theme. */
  color?: TextColor;
};

export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[theme.typography[variant], { color: theme.colors.text[color] }, style]}
      {...rest}
    />
  );
}
```

`client/src/ui/index.ts`:

```ts
export { Text, type TextProps, type TextColor } from './text/text';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/ui/text`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/src/ui
git commit -m "feat(client): add Text primitive"
```

---

### Task 6: Storybook (on-device + web) with the `Text` stories

**Files:**
- Modify: `client/package.json` (deps, scripts), root `package.json` (scripts)
- Modify: `client/metro.config.js`, `client/jest.config.js`, `client/tsconfig.json`, root `eslint.config.mjs`, root `.prettierignore`, root `.gitignore`
- Create: `client/src/storybook/with-theme.tsx`, `with-fonts.tsx`, `with-fonts.web.tsx`, `preview.tsx`
- Create: `client/.rnstorybook/main.ts`, `preview.tsx`, `index.tsx` (+ generated `storybook.requires.ts`)
- Create: `client/.storybook/main.ts`, `preview.tsx`, `preview-head.html`
- Create: `client/src/test/stories.tsx`; modify `client/src/test/setup.ts`
- Create: `client/src/ui/text/text.stories.tsx`; modify `client/src/ui/text/text.test.tsx`

**Interfaces:**
- Produces: `describeStories(name: string, csf)` from `@/test/stories` — renders every story in light and dark. Stories type with `import type { Meta, StoryObj } from '@storybook/react'`.
- Storybook global `scheme` (`'system' | 'light' | 'dark'`, default `system`) selects the theme via the shared `withTheme` decorator.

- [ ] **Step 1: Install Storybook and its peers**

```bash
CI=1 pnpm --filter @nudge/client add -D storybook@^10.6.0 @storybook/react@^10.6.0 @storybook/react-native@^10.6.0 @storybook/react-native-web-vite@^10.6.0 @storybook/addon-ondevice-controls@^10.6.0 @storybook/addon-ondevice-actions@^10.6.0 vite@^8.0.0
CI=1 pnpm --filter @nudge/client add @gorhom/bottom-sheet@^5.2.8
CI=1 pnpm --filter @nudge/client exec expo install react-native-svg @expo-google-fonts/inter
```

`@gorhom/bottom-sheet` and `react-native-svg` are runtime peers of the on-device Storybook UI. A peer warning about `react-native-safe-area-context@5.8.0` vs the SDK's `~5.7.0` is expected; do not bump it away from the Expo-pinned version.

- [ ] **Step 2: Shared Storybook annotations**

`client/src/storybook/with-theme.tsx`:

```tsx
import type { Decorator } from '@storybook/react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemeProvider, createMemoryThemeStorage, parseThemeMode, useTheme } from '@/theme';

// Shared across stories on purpose: Storybook must never touch the app's persisted mode.
const storage = createMemoryThemeStorage();

function Canvas({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: theme.spacing[4], backgroundColor: theme.colors.background }}>
      {children}
    </View>
  );
}

/**
 * Wraps every story in the app ThemeProvider. The `scheme` global (web toolbar) picks
 * light/dark/system; on device there is no toolbar, so `system` follows the simulator's
 * appearance setting. `key` remounts the provider so a toolbar change applies immediately.
 */
export const withTheme: Decorator = (Story, context) => {
  const mode = parseThemeMode(context.globals.scheme) ?? 'system';
  return (
    <ThemeProvider key={mode} storage={storage} initialMode={mode}>
      <Canvas>
        <Story />
      </Canvas>
    </ThemeProvider>
  );
};
```

`client/src/storybook/with-fonts.tsx` (native):

```tsx
import { Inter_300Light, Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import type { Decorator } from '@storybook/react';

/** Loads Inter before rendering stories so type matches the app. */
export const withFonts: Decorator = (Story) => {
  const [loaded, error] = useFonts({ Inter_300Light, Inter_400Regular, Inter_600SemiBold });
  if (!loaded && !error) return null;
  return <Story />;
};
```

`client/src/storybook/with-fonts.web.tsx` (web: Inter comes from `.storybook/preview-head.html`):

```tsx
import type { Decorator } from '@storybook/react';

export const withFonts: Decorator = (Story) => <Story />;
```

`client/src/storybook/preview.tsx`:

```tsx
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
```

- [ ] **Step 3: On-device Storybook config**

`client/.rnstorybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: ['../src/**/*.stories.?(ts|tsx)'],
  deviceAddons: ['@storybook/addon-ondevice-controls', '@storybook/addon-ondevice-actions'],
};

export default main;
```

`client/.rnstorybook/preview.tsx`:

```tsx
export { default } from '../src/storybook/preview';
```

`client/.rnstorybook/index.tsx`:

```tsx
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
```

Wrap Metro — replace the last line of `client/metro.config.js` (`module.exports = config;`) with:

```js
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

// Storybook is only bundled when the flag is set; otherwise its imports become empty modules.
module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  configPath: path.resolve(projectRoot, '.rnstorybook'),
});
```

Generate the requires file once (it is regenerated on every Metro start, and is committed so `tsc` can resolve it):

```bash
pnpm --filter @nudge/client exec sb-rn-get-stories
```

Expected: `client/.rnstorybook/storybook.requires.ts` exists and references `../src`.

- [ ] **Step 4: Web Storybook config**

`client/.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'path';

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
          { find: /^@\/assets\//, replacement: `${path.resolve(__dirname, '../assets')}/` },
          { find: /^@\//, replacement: `${path.resolve(__dirname, '../src')}/` },
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
```

`client/.storybook/preview.tsx`:

```tsx
export { default } from '../src/storybook/preview';
```

`client/.storybook/preview-head.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap"
  rel="stylesheet"
/>
```

Exclude the Node-flavoured web config from the app's typecheck: in `client/tsconfig.json` add

```json
"exclude": [".storybook", "storybook-static"]
```

- [ ] **Step 5: Scripts and ignores**

`client/package.json` scripts — add:

```json
"storybook": "storybook dev -p 6006",
"storybook:build": "storybook build",
"storybook:ios": "EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start --ios",
"storybook:android": "EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start --android",
"storybook:generate": "sb-rn-get-stories"
```

Root `package.json` scripts — add after `client:android`:

```json
"storybook": "pnpm --filter @nudge/client storybook",
"storybook:ios": "pnpm --filter @nudge/client storybook:ios",
"storybook:android": "pnpm --filter @nudge/client storybook:android",
```

Root `.gitignore` — add:

```
client/storybook-static/
```

Root `.prettierignore` — add:

```
client/.rnstorybook/storybook.requires.ts
```

Root `eslint.config.mjs` — add to the top `ignores` array:

```js
'client/.rnstorybook/storybook.requires.ts',
'client/storybook-static/**',
```

- [ ] **Step 6: Jest — transpile Storybook and register the shared annotations**

`client/jest.config.js` — add (jest-expo's own list plus `storybook|@storybook/react`; setting this key replaces the preset's list):

```js
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|jest-expo|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|storybook|@storybook/react|uuid|@react-native/.*)',
  ],
```

Append to `client/src/test/setup.ts`:

```ts
import { setProjectAnnotations } from '@storybook/react';

import preview from '@/storybook/preview';

// Fonts never finish loading in Jest; the `withFonts` decorator would otherwise render null.
jest.mock('@expo-google-fonts/inter', () => ({
  Inter_300Light: 'Inter_300Light',
  Inter_400Regular: 'Inter_400Regular',
  Inter_600SemiBold: 'Inter_600SemiBold',
  useFonts: () => [true, null],
}));

// Portable stories get the same decorators as Storybook (ThemeProvider, fonts).
setProjectAnnotations(preview);
```

(Keep the existing mock + `mockSystemScheme` + `beforeEach`; put the new imports with the others at the top of the file — `jest.mock` calls are hoisted above imports automatically.)

`client/src/test/stories.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import { mockSystemScheme } from '@/test/setup';

type CsfModule = Parameters<typeof composeStories>[0];

/**
 * One render test per story per colour scheme. The `withTheme` decorator resolves `system`
 * through the (mocked) OS scheme, so flipping the mock flips the theme.
 */
export function describeStories(name: string, csf: CsfModule): void {
  const stories = Object.entries(composeStories(csf));

  describe.each(['light', 'dark'] as const)(`${name} stories (%s)`, (scheme) => {
    beforeEach(() => mockSystemScheme(scheme));

    it.each(stories)('renders %s', (_storyName, Story) => {
      render(<Story />);
      expect(screen.toJSON()).not.toBeNull();
    });
  });
}
```

- [ ] **Step 7: Write the `Text` stories and extend its test**

`client/src/ui/text/text.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';

import { Text } from './text';

const meta = {
  title: 'UI/Text',
  component: Text,
  args: { children: 'Anastasia Kleisioni' },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Body: Story = {};

export const BodyLight: Story = { args: { variant: 'bodyLight', children: '288 d ago' } };

export const Title: Story = { args: { variant: 'title', children: 'Your friend list' } };

export const Caption: Story = { args: { variant: 'caption', children: 'Caption' } };

export const Secondary: Story = { args: { color: 'secondary' } };

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text variant="title">Title 28/36</Text>
      <Text variant="body">Body 15/20</Text>
      <Text variant="bodyLight">Body light 12/16</Text>
      <Text variant="caption">Caption 12/16</Text>
      <Text color="secondary">Secondary colour</Text>
    </View>
  ),
};
```

Add to `client/src/ui/text/text.test.tsx` (new imports at the top, new block at the bottom):

```tsx
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react-native';

import { describeStories } from '@/test/stories';
import * as stories from './text.stories';

describeStories('Text', stories);

it('matches the default story snapshot', () => {
  const { Body } = composeStories(stories);
  expect(render(<Body />).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 8: Run tests, then verify both Storybooks**

Run: `pnpm --filter @nudge/client test`
Expected: PASS, including `Text stories (light)` / `(dark)` × 6 and one new snapshot written under `client/src/ui/text/__snapshots__/`.

If the Storybook packages fail to transform (SyntaxError on `export` inside `node_modules/storybook`), the `transformIgnorePatterns` entry is wrong — re-check Step 6.

Run: `pnpm --filter @nudge/client storybook:build`
Expected: `storybook-static/` is produced with no errors — proves Vite compiles the RN-web path (`.web.tsx` decorators, `@/` aliases). Then `pnpm --filter @nudge/client storybook` and open http://localhost:6006 — `UI/Text` stories render, and the "Scheme" toolbar switches light/dark. Stop the server.

Manual (needs a simulator; skip if unavailable and note it in the task report): `pnpm storybook:ios` — the app boots into the Storybook UI listing `UI/Text`.

- [ ] **Step 9: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add package.json client/package.json pnpm-lock.yaml client/metro.config.js client/jest.config.js client/tsconfig.json eslint.config.mjs .prettierignore .gitignore client/.rnstorybook client/.storybook client/src/storybook client/src/test client/src/ui/text
git commit -m "feat(client): add on-device and web Storybook with shared theme decorators"
```

---

### Task 7: `Avatar` primitive

**Files:**
- Create: `client/src/ui/avatar/avatar.tsx`, `avatar.stories.tsx`
- Modify: `client/src/ui/index.ts`
- Test: `client/src/ui/avatar/avatar.test.tsx`

**Interfaces:**
- Produces: `Avatar` from `@/ui` with `AvatarProps = { label: string; size?: number (default 49); source?: string; style?: StyleProp<ViewStyle> }`.

- [ ] **Step 1: Write the failing test**

`client/src/ui/avatar/avatar.test.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { Avatar } from '@/ui';

import * as stories from './avatar.stories';

describe('Avatar', () => {
  it('renders an accent-filled circle when there is no image', () => {
    renderWithTheme(<Avatar label="Anastasia Kleisioni" />);
    const node = screen.getByLabelText('Anastasia Kleisioni');
    expect(node).toHaveStyle({ width: 49, height: 49, borderRadius: 9999, backgroundColor: '#3a448a' });
    expect(screen.queryByTestId('avatar-image')).toBeNull();
  });

  it('honours size', () => {
    renderWithTheme(<Avatar label="Aku" size={80} />);
    expect(screen.getByLabelText('Aku')).toHaveStyle({ width: 80, height: 80 });
  });

  it('renders the image when a source is given', () => {
    renderWithTheme(<Avatar label="Aku" source="https://example.com/aku.png" />);
    const image = screen.getByTestId('avatar-image');
    expect(image.props.source).toEqual({ uri: 'https://example.com/aku.png' });
    expect(image.props.accessibilityLabel).toBe('Aku');
  });
});

describeStories('Avatar', stories);

it('matches the default story snapshot', () => {
  const { Placeholder } = composeStories(stories);
  expect(render(<Placeholder />).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/ui/avatar`
Expected: FAIL — `Avatar` is not exported / stories module missing.

- [ ] **Step 3: Implement `Avatar` and its stories**

`client/src/ui/avatar/avatar.tsx`:

```tsx
import { Image } from 'expo-image';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type AvatarProps = {
  /** Who the picture shows; used as the accessibility label. */
  label: string;
  /** Diameter in px. Figma contact row uses 49. */
  size?: number;
  /** Remote image URL. Without it the avatar is a solid accent disc (Figma placeholder). */
  source?: string;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ label, size = 49, source, style }: AvatarProps) {
  const theme = useTheme();
  const shape: ViewStyle = {
    width: size,
    height: size,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accent,
  };

  if (source) {
    return (
      <Image
        testID="avatar-image"
        source={{ uri: source }}
        style={[shape, style]}
        contentFit="cover"
        accessibilityLabel={label}
      />
    );
  }

  return <View accessibilityRole="image" accessibilityLabel={label} style={[shape, style]} />;
}
```

`client/src/ui/avatar/avatar.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from './avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  args: { label: 'Anastasia Kleisioni' },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const WithImage: Story = {
  args: { source: 'https://i.pravatar.cc/98?img=47' },
};

export const Large: Story = { args: { size: 80 } };
```

Add to `client/src/ui/index.ts`:

```ts
export { Avatar, type AvatarProps } from './avatar/avatar';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/ui/avatar`
Expected: PASS; snapshot written.

If `expo-image` fails to render in Jest (missing native module), add `jest.mock('expo-image', () => { const { Image } = require('react-native'); return { Image }; });` at the top of `src/test/setup.ts` and rerun.

- [ ] **Step 5: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/src/ui
git commit -m "feat(client): add Avatar primitive"
```

---

### Task 8: `Checkbox` primitive

**Files:**
- Create: `client/assets/icons/checkbox-check.svg` (Figma export, node `3001:1140`)
- Create: `client/src/types/assets.d.ts`
- Create: `client/src/ui/checkbox/checkbox.tsx`, `checkbox.stories.tsx`
- Modify: `client/src/ui/index.ts`
- Test: `client/src/ui/checkbox/checkbox.test.tsx`

**Interfaces:**
- Produces: `Checkbox` from `@/ui` with `CheckboxProps = { checked: boolean; onCheckedChange(checked: boolean): void; disabled?: boolean; accessibilityLabel?: string }`.

- [ ] **Step 1: Commit the Figma asset**

The checked state exported from Figma is a 40×39 SVG whose 18×18 box sits at (11,10). Save it as `client/assets/icons/checkbox-check.svg` with the viewBox cropped to the box (the vector data is untouched):

```svg
<svg width="18" height="18" viewBox="11 10 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Rectangle 16">
<rect id="Rectangle 16_2" x="11" y="10" width="18" height="18" rx="2" fill="#3A448A"/>
<path id="Icon" d="M25.6667 15L18.3333 22.3333L15 19" stroke="#F8F8F8" stroke-width="1.6" stroke-linejoin="round"/>
</g>
</svg>
```

`client/src/types/assets.d.ts`:

```ts
// Metro resolves image imports to an asset id (number); Vite (web Storybook) to a URL string.
declare module '*.svg' {
  const source: number | string;
  export default source;
}
```

- [ ] **Step 2: Write the failing test**

`client/src/ui/checkbox/checkbox.test.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { Checkbox } from '@/ui';

import * as stories from './checkbox.stories';

describe('Checkbox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes checkbox semantics', () => {
    renderWithTheme(<Checkbox checked={false} onCheckedChange={() => {}} accessibilityLabel="Aku" />);
    const box = screen.getByRole('checkbox', { name: 'Aku' });
    expect(box).toHaveAccessibilityState({ checked: false, disabled: false });
    expect(box).toHaveStyle({ width: 18, height: 18, borderRadius: 2, borderWidth: 1 });
  });

  it('reports the toggled value on press', async () => {
    const onCheckedChange = jest.fn();
    renderWithTheme(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('reports false when already checked', async () => {
    const onCheckedChange = jest.fn();
    renderWithTheme(<Checkbox checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole('checkbox')).toHaveAccessibilityState({ checked: true });
    expect(screen.getByTestId('checkbox-check')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('does nothing when disabled', async () => {
    const onCheckedChange = jest.fn();
    renderWithTheme(<Checkbox checked={false} disabled onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole('checkbox')).toHaveAccessibilityState({ disabled: true });
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describeStories('Checkbox', stories);

it('matches the default story snapshot', () => {
  const { Unchecked } = composeStories(stories);
  expect(render(<Unchecked />).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/ui/checkbox`
Expected: FAIL — `Checkbox` not exported.

- [ ] **Step 4: Implement `Checkbox` and its stories**

`client/src/ui/checkbox/checkbox.tsx`:

```tsx
import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import checkIcon from '@/assets/icons/checkbox-check.svg';
import { type Theme, useStyles } from '@/theme';

export type CheckboxProps = {
  checked: boolean;
  /** Called with the next value; the component is fully controlled. */
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const SIZE = 18;
/** Figma's enlarged "touch area" — brings the target to 38×38. */
const HIT_SLOP = 10;

export function Checkbox({ checked, onCheckedChange, disabled = false, accessibilityLabel }: CheckboxProps) {
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={() => onCheckedChange(!checked)}
      style={[styles.box, checked && styles.checked, disabled && styles.disabled]}
    >
      {checked ? (
        <Image testID="checkbox-check" source={checkIcon} style={styles.icon} contentFit="contain" />
      ) : null}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // The exported asset already paints the filled box, so the border goes away.
  checked: { borderWidth: 0 },
  disabled: { opacity: 0.4 },
  icon: { width: SIZE, height: SIZE },
});
```

`client/src/ui/checkbox/checkbox.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Checkbox } from './checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: { checked: false, onCheckedChange: fn(), accessibilityLabel: 'Contacted' },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, checked: true } };

/** Toggle it on the device/browser. */
export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked);
    return <Checkbox {...args} checked={checked} onCheckedChange={setChecked} />;
  },
};
```

Add to `client/src/ui/index.ts`:

```ts
export { Checkbox, type CheckboxProps } from './checkbox/checkbox';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/ui/checkbox`
Expected: PASS; snapshot written.

- [ ] **Step 6: Verify the asset renders in web Storybook**

Run: `pnpm --filter @nudge/client storybook:build`
Expected: builds; the SVG import resolves through the `@/assets` alias. Optionally `pnpm storybook` and check `UI/Checkbox/Checked` shows the indigo box with a white tick.

- [ ] **Step 7: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/assets/icons client/src/types client/src/ui
git commit -m "feat(client): add Checkbox primitive with Figma check asset"
```

---

### Task 9: `ContactRow`

**Files:**
- Create: `client/src/components/contact/contact-row.tsx`, `contact-row.stories.tsx`
- Test: `client/src/components/contact/contact-row.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Checkbox`, `Text` from `@/ui`; `formatDaysAgo` from `@/lib/date`; `useStyles`, `Theme` from `@/theme`.
- Produces: `ContactRow` from `@/components/contact/contact-row`:

```ts
export type ContactRowProps = {
  name: string;
  avatarUri?: string;
  lastContactAt: Date;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Tapping the avatar + name. Omit to make that area non-interactive. */
  onPress?: () => void;
  /** Reference time for "n d ago"; defaults to now. Stories/tests pin it for determinism. */
  now?: Date;
};
```

- [ ] **Step 1: Write the failing test**

`client/src/components/contact/contact-row.test.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ContactRow } from './contact-row';
import * as stories from './contact-row.stories';

const NOW = new Date('2026-09-14T12:00:00Z');
const LAST_CONTACT = new Date('2025-11-30T12:00:00Z'); // 288 days before NOW

const baseProps = {
  name: 'Anastasia Kleisioni',
  lastContactAt: LAST_CONTACT,
  checked: false,
  onCheckedChange: () => {},
  now: NOW,
};

describe('ContactRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the name, avatar and relative date', () => {
    renderWithTheme(<ContactRow {...baseProps} />);
    expect(screen.getByText('Anastasia Kleisioni')).toBeOnTheScreen();
    expect(screen.getByText('288 d ago')).toBeOnTheScreen();
    expect(screen.getByLabelText('Anastasia Kleisioni')).toBeOnTheScreen();
  });

  it('truncates long names to one line', () => {
    renderWithTheme(<ContactRow {...baseProps} name="Anastasia Kleisioni-Papadopoulou" />);
    expect(screen.getByText('Anastasia Kleisioni-Papadopoulou').props.numberOfLines).toBe(1);
  });

  it('forwards checkbox changes', async () => {
    const onCheckedChange = jest.fn();
    renderWithTheme(<ContactRow {...baseProps} onCheckedChange={onCheckedChange} />);
    await userEvent.setup().press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('calls onPress when the profile area is tapped', async () => {
    const onPress = jest.fn();
    renderWithTheme(<ContactRow {...baseProps} onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Anastasia Kleisioni' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button without onPress', () => {
    renderWithTheme(<ContactRow {...baseProps} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describeStories('ContactRow', stories);

it('matches the default story snapshot', () => {
  const { Default } = composeStories(stories);
  expect(render(<Default />).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/components/contact`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ContactRow` and its stories**

`client/src/components/contact/contact-row.tsx`:

```tsx
import { Pressable, View } from 'react-native';

import { formatDaysAgo } from '@/lib/date';
import { type Theme, useStyles } from '@/theme';
import { Avatar, Checkbox, Text } from '@/ui';

export type ContactRowProps = {
  name: string;
  avatarUri?: string;
  lastContactAt: Date;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Tapping the avatar + name. Omit to make that area non-interactive. */
  onPress?: () => void;
  /** Reference time for "n d ago"; defaults to now. Stories/tests pin it for determinism. */
  now?: Date;
};

/** Figma "contact": avatar · name · "288 d ago" · checkbox. Fully controlled. */
export function ContactRow({
  name,
  avatarUri,
  lastContactAt,
  checked,
  onCheckedChange,
  onPress,
  now,
}: ContactRowProps) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.profile}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? name : undefined}
      >
        <Avatar label={name} source={avatarUri} />
        <Text variant="body" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
      </Pressable>
      <View style={styles.meta}>
        <Text variant="bodyLight" style={styles.date}>
          {formatDaysAgo(lastContactAt, now)}
        </Text>
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} accessibilityLabel={name} />
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[2],
  },
  profile: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[2],
  },
  name: { flexShrink: 1 },
  meta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing[4],
  },
  date: { textAlign: 'right' as const },
});
```

`client/src/components/contact/contact-row.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ContactRow } from './contact-row';

const NOW = new Date('2026-09-14T12:00:00Z');
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const meta = {
  title: 'Components/ContactRow',
  component: ContactRow,
  args: {
    name: 'Anastasia Kleisioni',
    lastContactAt: daysBefore(288),
    checked: false,
    onCheckedChange: fn(),
    onPress: fn(),
    now: NOW,
  },
} satisfies Meta<typeof ContactRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { checked: true } };

export const ContactedToday: Story = { args: { name: 'Aku Koskien', lastContactAt: NOW } };

export const LongName: Story = {
  args: { name: 'Anastasia Kleisioni-Papadopoulou of Thessaloniki', lastContactAt: daysBefore(12) },
};

export const WithAvatarImage: Story = {
  args: { avatarUri: 'https://i.pravatar.cc/98?img=47' },
};

export const NotPressable: Story = { args: { onPress: undefined } };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/components/contact`
Expected: PASS; snapshot written.

- [ ] **Step 5: Lint, types, commit**

Run: `pnpm lint && pnpm typecheck && pnpm format:check`

```bash
git add client/src/components/contact
git commit -m "feat(client): add ContactRow component from Figma"
```

---

### Task 10: App shell, Contacts demo screen, template removal

**Files:**
- Modify: `client/package.json` (add `@tanstack/react-query`; drop template-only deps)
- Create: `client/src/lib/query-client.ts`
- Create: `client/src/components/settings/theme-mode-picker.tsx`, `.stories.tsx`, `.test.tsx`
- Rewrite: `client/src/app/_layout.tsx`, `client/src/app/index.tsx`
- Delete: `client/src/app/explore.tsx`, `client/src/components/{animated-icon.tsx,animated-icon.web.tsx,animated-icon.module.css,app-tabs.tsx,app-tabs.web.tsx,external-link.tsx,hint-row.tsx,themed-text.tsx,themed-view.tsx,web-badge.tsx}`, `client/src/components/ui/collapsible.tsx`, `client/src/constants/theme.ts`, `client/src/hooks/{use-color-scheme.ts,use-color-scheme.web.ts,use-theme.ts}`, `client/src/global.css`, unused template images.

**Interfaces:**
- Consumes: `ThemeProvider`, `useThemeMode`, `useTheme`, `useStyles`; `ContactRow`; `Text` from `@/ui`.
- Produces: `ThemeModePicker` (`{ label?: string }`, reads/writes `useThemeMode`), `queryClient` from `@/lib/query-client`.

- [ ] **Step 1: Install React Query; remove template-only dependencies**

```bash
CI=1 pnpm --filter @nudge/client add @tanstack/react-query@^5.90.0
```

Confirm nothing else uses the template-only packages, then remove them:

```bash
grep -rn "expo-symbols\|expo-web-browser\|expo-glass-effect\|@expo/ui\|expo-device" client/src client/app.json
```

Expected after this task's deletions: no matches outside the files being deleted. Then:

```bash
CI=1 pnpm --filter @nudge/client remove @expo/ui expo-glass-effect expo-symbols expo-web-browser expo-device
```

- [ ] **Step 2: Write the failing `ThemeModePicker` test**

`client/src/components/settings/theme-mode-picker.test.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { createMemoryThemeStorage } from '@/theme';

import { ThemeModePicker } from './theme-mode-picker';
import * as stories from './theme-mode-picker.stories';

describe('ThemeModePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks the current mode as selected', () => {
    renderWithTheme(<ThemeModePicker />, { scheme: 'dark' });
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAccessibilityState({ selected: true });
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAccessibilityState({ selected: false });
  });

  it('persists the tapped mode', async () => {
    const storage = createMemoryThemeStorage();
    renderWithTheme(<ThemeModePicker />, { storage });
    await userEvent.setup().press(screen.getByRole('radio', { name: 'System' }));
    expect(storage.get()).toBe('system');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAccessibilityState({ selected: true });
  });
});

describeStories('ThemeModePicker', stories);

it('matches the default story snapshot', () => {
  const { Default } = composeStories(stories);
  expect(render(<Default />).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @nudge/client test -- src/components/settings`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `ThemeModePicker` and its stories**

`client/src/components/settings/theme-mode-picker.tsx`:

```tsx
import { Pressable, View } from 'react-native';

import { THEME_MODES, type Theme, type ThemeMode, useStyles, useThemeMode } from '@/theme';
import { Text } from '@/ui';

const LABELS: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export type ThemeModePickerProps = { label?: string };

/** Segmented control that sets (and persists) the app's theme mode. */
export function ThemeModePicker({ label = 'Appearance' }: ThemeModePickerProps) {
  const { mode, setMode } = useThemeMode();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {THEME_MODES.map((option) => {
          const selected = option === mode;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={LABELS[option]}
              accessibilityState={{ selected }}
              onPress={() => setMode(option)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text variant="caption" color={selected ? 'primary' : 'secondary'}>
                {LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  container: { gap: theme.spacing[1] },
  options: {
    flexDirection: 'row' as const,
    gap: theme.spacing[1],
    padding: theme.spacing[1],
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    alignSelf: 'flex-start' as const,
  },
  option: {
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.md,
  },
  optionSelected: { backgroundColor: theme.colors.background },
});
```

`client/src/components/settings/theme-mode-picker.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';

import { ThemeModePicker } from './theme-mode-picker';

const meta = {
  title: 'Components/ThemeModePicker',
  component: ThemeModePicker,
} satisfies Meta<typeof ThemeModePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Tapping an option re-themes the story canvas — the decorator's ThemeProvider is the one being driven. */
export const Default: Story = {};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @nudge/client test -- src/components/settings`
Expected: PASS.

- [ ] **Step 6: Query client and the new app shell**

`client/src/lib/query-client.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

/** Single React Query client for the app. No queries exist yet; screens add hooks under src/api/. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});
```

Replace `client/src/app/_layout.tsx`:

```tsx
import { Inter_300Light, Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import StorybookUI from '../../.rnstorybook';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider, useTheme, useThemeMode } from '@/theme';

const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // `pnpm storybook:ios` / `storybook:android` boot straight into the component catalogue.
  if (STORYBOOK_ENABLED) {
    return <StorybookUI />;
  }
  return <App />;
}

function App() {
  const [fontsLoaded, fontError] = useFonts({ Inter_300Light, Inter_400Regular, Inter_600SemiBold });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Feeds the resolved scheme to expo-router so native chrome (headers, backgrounds) matches. */
function Navigation() {
  const { scheme } = useThemeMode();
  const theme = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: theme.colors.accent,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text.primary,
          border: theme.colors.border,
        },
      }}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
    </NavigationThemeProvider>
  );
}
```

Replace `client/src/app/index.tsx` with the Contacts demo screen:

```tsx
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactRow } from '@/components/contact/contact-row';
import { ThemeModePicker } from '@/components/settings/theme-mode-picker';
import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/** Placeholder data until the contacts API is wired through React Query. */
const CONTACTS = [
  { id: '1', name: 'Anastasia Kleisioni', lastContactAt: daysAgo(288) },
  { id: '2', name: 'Aku Koskien', lastContactAt: daysAgo(12) },
  { id: '3', name: 'Borbála Varga', lastContactAt: daysAgo(0) },
  { id: '4', name: 'Elia Cagnazo', lastContactAt: daysAgo(45) },
];

export default function ContactsScreen() {
  const styles = useStyles(makeStyles);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string, checked: boolean) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={CONTACTS}
        keyExtractor={(contact) => contact.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title">Your friend list</Text>
            <ThemeModePicker />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ContactRow
            name={item.name}
            lastContactAt={item.lastContactAt}
            checked={checkedIds.has(item.id)}
            onCheckedChange={(checked) => toggle(item.id, checked)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[6] },
  header: { gap: theme.spacing[4], paddingVertical: theme.spacing[5] },
  separator: { height: theme.spacing[5] },
});
```

- [ ] **Step 7: Delete the template scaffolding**

```bash
git rm -q client/src/app/explore.tsx \
  client/src/components/animated-icon.tsx client/src/components/animated-icon.web.tsx client/src/components/animated-icon.module.css \
  client/src/components/app-tabs.tsx client/src/components/app-tabs.web.tsx \
  client/src/components/external-link.tsx client/src/components/hint-row.tsx \
  client/src/components/themed-text.tsx client/src/components/themed-view.tsx \
  client/src/components/ui/collapsible.tsx client/src/components/web-badge.tsx \
  client/src/constants/theme.ts \
  client/src/hooks/use-color-scheme.ts client/src/hooks/use-color-scheme.web.ts client/src/hooks/use-theme.ts \
  client/src/global.css
git rm -q -r client/assets/images/tabIcons
git rm -q client/assets/images/expo-badge.png client/assets/images/expo-badge-white.png client/assets/images/expo-logo.png \
  client/assets/images/logo-glow.png client/assets/images/react-logo.png client/assets/images/react-logo@2x.png \
  client/assets/images/react-logo@3x.png client/assets/images/tutorial-web.png
rmdir client/src/constants client/src/hooks client/src/components/ui 2>/dev/null || true
```

Keep `icon.png`, `splash-icon.png`, `favicon.png`, the `android-icon-*.png` files and `expo.icon` — `app.json` references them.

Confirm nothing references the removed modules:

```bash
grep -rn "constants/theme\|hooks/use-\|themed-text\|themed-view\|global.css\|app-tabs\|animated-icon" client/src client/app.json
```

Expected: no output.

- [ ] **Step 8: Verify**

Run: `pnpm --filter @nudge/client test` — all green.
Run: `pnpm typecheck && pnpm lint && pnpm format:check` — clean. If `expo-router` complains that `typedRoutes` types still mention `explore`, run `pnpm --filter @nudge/client exec expo customize` is **not** needed — the `.expo/types` folder regenerates on the next `expo start`; delete `client/.expo/types` if stale.
Run: `pnpm --filter @nudge/client exec expo export --platform ios --output-dir /tmp/nudge-export-check` — the bundle builds (proves Metro resolves the `.rnstorybook` import and the SVG asset). Delete the output afterwards.

Manual (simulator): `pnpm client:ios` — the Contacts screen shows four rows; the appearance picker switches theme immediately and the choice survives an app restart. If the dev client predates this task, rebuild it first (`pnpm --filter @nudge/client exec expo run:ios`) because `expo-sqlite` and `react-native-svg` are native modules.

- [ ] **Step 9: Commit**

```bash
git add -A client package.json pnpm-lock.yaml
git commit -m "feat(client): wire ThemeProvider, React Query and Contacts demo screen; drop Expo template demo"
```

---

### Task 11: Documentation

**Files:**
- Modify: `README.md`
- Modify: `client/README.md` (if it still describes the template; otherwise leave)

- [ ] **Step 1: Update the root README**

In the **Layout** table add rows after `client/`:

```markdown
| `client/src/theme/`  | —               | Design tokens + persisted light/dark `ThemeProvider`.  |
| `client/src/ui/`     | —               | Generic primitives (`Text`, `Avatar`, `Checkbox`).     |
| `client/src/components/` | —           | App-specific compositions (`ContactRow`, …).           |
```

After the **Mobile client (Expo)** section add:

```markdown
## Design system & Storybook

Components are built from typed theme tokens (`client/src/theme`) with plain `StyleSheet`; every
component folder holds the component, its `*.stories.tsx` and its test. `useTheme()` /
`useStyles()` read the active theme; `useThemeMode().setMode('dark' | 'light' | 'system')`
changes it and the choice is persisted (`expo-sqlite/kv-store` on device, `localStorage` on web).

| Command                  | What                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `pnpm storybook`         | Web Storybook (react-native-web + Vite) at http://localhost:6006 |
| `pnpm storybook:ios`     | Boot the Expo app into the on-device Storybook (iOS simulator)   |
| `pnpm storybook:android` | Same, Android emulator                                            |

Both runtimes read the same `src/**/*.stories.tsx`. The "Scheme" toolbar in the web UI switches
light/dark; on device, `system` follows the simulator's appearance setting.

## Frontend testing

`pnpm test` runs `jest-expo` + React Native Testing Library in `client/`:

- **Story render tests** — every story is rendered in light and dark via Storybook portable stories (`describeStories`), so a new story is a new test.
- **Behaviour tests** — RTL queries and `userEvent` assert roles, accessibility state and callbacks (e.g. pressing a checkbox calls `onCheckedChange`).
- **Snapshot tests** — exactly one `toMatchSnapshot()` per component, on its default story, to catch unintended structural changes.
- **Not covered yet** — pixel/visual regression and end-to-end flows (Maestro); the story setup leaves room for both.
```

In the **Quality** table change the `pnpm test` row to:

```markdown
| `pnpm test`         | Unit tests in every package (`vitest` server, `jest` client) |
```

- [ ] **Step 2: Client README**

Open `client/README.md`; if it is the Expo template text, replace its body with a pointer:

```markdown
# @nudge/client

Expo app. See the root [README](../README.md) for commands, the design system and testing.
Storybook configs live in `.rnstorybook/` (device) and `.storybook/` (web); `storybook.requires.ts`
is generated by Metro (`pnpm --filter @nudge/client storybook:generate` refreshes it by hand).
```

- [ ] **Step 3: Format and commit**

Run: `pnpm format:check` (fix with `pnpm format` if needed).

```bash
git add README.md client/README.md
git commit -m "docs: document design system, Storybook and frontend testing"
```

---

## Self-review

- **Spec coverage:** tokens/theme (T2), persistence incl. web adapter (T3), provider/hooks/useStyles/app integration + navigation theme + React Query (T4, T10), Storybook native + web + shared decorators + scheme toggle (T6), Jest + story render + behaviour + snapshot + theme tests (T1, T4, T6–T10), `Text`/`Avatar`/`Checkbox`/`ContactRow` with the spec'd props (T5, T7–T9), `formatDaysAgo` (T1), template removal (T10, per the user's later decision to replace the demo rather than re-point it), README bullets (T11). Root `storybook*` scripts (T6).
- **Types:** `ThemeStorage`, `ThemeMode`, `createMemoryThemeStorage`, `parseThemeMode` (T3) are what T4/T6/T10 import; `useStyles(makeStyles)` signature is identical in T4, T8, T9, T10; `describeStories(name, csf)` and `mockSystemScheme(scheme)` match between T4/T6 and later tests; `ContactRowProps` in T9 equals the spec plus the documented `now` prop.
- **Deviation from spec, deliberate:** the `now` prop on `ContactRow` (deterministic stories/snapshots) and the `ThemeModePicker` demo component (exercises persistence; not a Figma component).
