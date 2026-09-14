# Client design system foundation — design

Date: 2026-09-14

## Goal

Give `@nudge/client` a design system that components are built on: typed design
tokens, a persisted light/dark theme, Storybook (on-device and web) driven by one set
of stories, and a Jest test setup. Deliver the first Figma component — `contact` —
and the three primitives it is composed of. No backend calls; the React Query provider
is mounted so screens can adopt it later.

Figma source: `Sendy-personal`, node `3001:1102` (`contact`), checkbox variants
`3001:1136`.

## Out of scope

- Every other Figma component (text field, nav bar, toggles, modals, headline).
- A settings UI to switch the theme; only the provider/API is built.
- A dark-mode design: dark colour values are placeholders with the same semantic keys.
- Pixel/visual-regression tests and E2E (Maestro).
- Any API wiring or React Query hooks.
- A separate `packages/ui` workspace package — one consumer, so it stays in `client/`.

## Layout

```
client/
├── .rnstorybook/            # on-device Storybook config (main.ts, preview.tsx)
├── .storybook/              # web Storybook config (main.ts, preview.tsx)
├── assets/icons/checkbox-check.svg   # exported from Figma, committed
└── src/
    ├── theme/               # foundation: tokens + provider; no components
    │   ├── tokens/{colors,spacing,typography,radii}.ts
    │   ├── theme.ts         # Theme type, lightTheme, darkTheme
    │   ├── theme-provider.tsx   # ThemeProvider, useTheme(), useThemeMode()
    │   ├── theme-storage.ts     # persistence adapter (native: expo-sqlite/kv-store)
    │   ├── theme-storage.web.ts # persistence adapter (web: localStorage)
    │   ├── use-styles.ts        # useStyles(theme => StyleSheet)
    │   └── index.ts
    ├── ui/                  # generic primitives; know nothing about the domain
    │   ├── text/       text.tsx, text.stories.tsx, text.test.tsx
    │   ├── avatar/     avatar.tsx, avatar.stories.tsx, avatar.test.tsx
    │   ├── checkbox/   checkbox.tsx, checkbox.stories.tsx, checkbox.test.tsx
    │   └── index.ts
    ├── components/          # app-specific compositions of ui/ primitives
    │   └── contact/    contact-row.tsx, contact-row.stories.tsx, contact-row.test.tsx
    ├── lib/date.ts          # formatDaysAgo + test
    ├── storybook/           # decorators shared by both Storybook configs
    └── test/render.tsx      # RTL render wrapped in ThemeProvider
```

Rules: one exported component per folder; component, stories and test sit side by
side; barrels (`index.ts`) exist only at `theme/` and `ui/`.

The Expo template's theme scaffolding is **replaced**, not kept alongside:
`constants/theme.ts`, `hooks/use-theme.ts`, `hooks/use-color-scheme(.web).ts`,
`components/themed-text.tsx` and `components/themed-view.tsx` are deleted. Template
demo screens (`app/index.tsx`, `app/explore.tsx`, `components/*`) are re-pointed at
`ui/Text` and `useTheme()` so they keep compiling; they are not redesigned.

## Styling approach

Plain React Native `StyleSheet` with typed theme tokens supplied through React
Context. No NativeWind/Unistyles/Tamagui: zero Babel/Metro plugins, identical
behaviour in the app, Jest, on-device Storybook and web Storybook, and no friction
with the React Compiler already enabled in `app.json`.

## Theme foundation

### Tokens

- `colors.ts` — a raw **palette** (`ink900: '#151518'`, `indigo600: '#3a448a'`,
  `gray300: '#cfcfcf'`, `white`, …) and a **semantic** map per scheme with identical
  keys: `text.primary`, `text.secondary`, `background`, `surface`, `border`,
  `accent`, `onAccent`. Components use semantic names only. Light values come from
  Figma; dark values are placeholders.
- `typography.ts` — variants `title`, `body` (Inter Regular 15), `bodyLight`
  (Inter Light 12), `caption`, each `{ fontFamily, fontSize, lineHeight, fontWeight }`.
  Inter is loaded with `expo-font`; the platform system font is the fallback.
- `spacing.ts` — 4-pt scale (`[0]=0, [1]=4, [2]=8, [3]=12, [4]=16, [5]=24, [6]=32`).
- `radii.ts` — `sm: 2`, `md: 8`, `full: 9999`.

### Theme object

`Theme = { scheme: 'light' | 'dark', colors, spacing, typography, radii }`.
`lightTheme` and `darkTheme` are the two concrete objects; `theme.ts` exports both and
the type.

### ThemeProvider

- State: `mode: 'system' | 'light' | 'dark'`, default `'system'`.
- Resolves `'system'` with React Native's `useColorScheme()`.
- `useTheme()` → the resolved `Theme`.
  `useThemeMode()` → `{ mode, setMode, scheme }`.
- Persistence: a `ThemeStorage = { get(): ThemeMode | null; set(mode): void }`
  interface passed as a prop, defaulting per platform to `expo-sqlite/kv-store`
  (`getItemSync`/`setItemSync`) on native and `localStorage` on web. The mode is read
  **synchronously** during the first render so there is no light→dark flash, and
  written on every `setMode`. Storybook and Jest inject an in-memory storage, so no
  SQLite is touched outside the app.
- `useStyles(makeStyles)` memoises `StyleSheet.create(makeStyles(theme))` per theme
  identity; components never put colour literals in JSX.

### App integration

`app/_layout.tsx` wraps the tree in `QueryClientProvider` (React Query, empty
client) and `ThemeProvider`, and picks expo-router's `DarkTheme`/`DefaultTheme` from
the resolved scheme.

## Storybook

- CSF3 `*.stories.tsx` next to every component, typed with `Meta` / `StoryObj`.
  Both runtimes index the same glob `src/**/*.stories.tsx`.
- **On-device** — `@storybook/react-native`. `metro.config.js` is wrapped with its
  `withStorybook` helper so the story index is generated automatically; enabled by
  `EXPO_PUBLIC_STORYBOOK=1`. When the flag is set, the root layout renders the
  Storybook UI instead of the app. Script: `storybook:ios` / `storybook:android`.
- **Web** — `@storybook/react-native-web-vite`, started with `storybook` (browser).
  Components needing native-only modules would need a `.web.tsx` twin; none in
  this slice.
- **Shared decorators** (`src/storybook/`) imported by both configs: a
  `ThemeProvider` wrapper with in-memory storage and a light/dark toolbar toggle so
  every story is inspectable in both schemes.
- Root `package.json` gains `storybook`, `storybook:ios`, `storybook:android`
  passthrough scripts next to `client:*`.

## Testing

- Runner: `jest-expo` preset + `@testing-library/react-native`, script `test` in
  `@nudge/client`, picked up by the root `pnpm test` (`pnpm -r test`).
- `src/test/render.tsx` renders under `ThemeProvider` with in-memory storage and a
  chosen scheme.
- **Story render tests** — every `*.test.tsx` composes its stories (`composeStories`)
  and asserts each mounts in light and dark. New story ⇒ new coverage, for free.
- **Behaviour tests** — RTL queries (`getByRole`, `getByText`) and `userEvent`:
  pressing the checkbox calls `onCheckedChange(!checked)` and flips
  `accessibilityState.checked`; `ContactRow` renders "288 d ago" for a date 288
  days back and forwards `onPress`.
- **Snapshots** — exactly one `toMatchSnapshot()` per component, on the default
  story only.
- **Theme tests** — restores a persisted mode on mount, `setMode` writes to storage,
  `'system'` follows the OS scheme.
- `formatDaysAgo` has its own unit test.
- README gets a "Frontend testing" section: one line each for story render tests,
  behaviour tests, snapshot tests, and what is deliberately not covered (visual
  regression, E2E).

## Components

### `ui/Text`

`<Text variant="body" color="primary" {...TextProps}>`. `variant` keys
`theme.typography`; `color` keys `theme.colors.text`. Replaces `ThemedText`.

### `ui/Avatar`

`<Avatar size={49} source={uri?} label="…" />`. Circle (`radii.full`); `expo-image`
when `source` is set, otherwise a solid `accent` fill (Figma's placeholder disc).
`label` becomes `accessibilityLabel`. No initials — Figma shows none.

### `ui/Checkbox`

`<Checkbox checked onCheckedChange disabled? />` on `Pressable`. 18×18, `radii.sm`,
1px `border` when unchecked; `accent` fill plus `assets/icons/checkbox-check.svg`
(via `expo-image`) when checked. Figma's enlarged touch area becomes `hitSlop` of
10px per side (≥ 38px target). `accessibilityRole="checkbox"`,
`accessibilityState={{ checked, disabled }}`.

### `components/contact/ContactRow`

```ts
type ContactRowProps = {
  name: string;
  avatarUri?: string;
  lastContactAt: Date; // rendered as "288 d ago"
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onPress?: () => void; // tapping the profile area (avatar + name)
};
```

Row, `gap: spacing[2]`. Left group: Avatar 49 + name (`body`, `flex: 1`,
`numberOfLines={1}` — Figma's fixed 165px column becomes a flex column). Right group,
`gap: spacing[4]`: relative date (`bodyLight`, right-aligned, `text.primary`) +
Checkbox. Fully controlled; no internal state. The date text comes from
`formatDaysAgo(date, now = new Date())` in `src/lib/date.ts`: `"today"` for 0 days,
otherwise `"{n} d ago"`.

Stories: `Text` (each variant), `Avatar` (placeholder, with image), `Checkbox`
(unchecked, checked, disabled), `ContactRow` (default, checked, long name).

## Dependencies (client)

Runtime: `@tanstack/react-query`, `expo-sqlite`, `expo-image` (present),
`expo-font` (present), `@expo-google-fonts/inter`.
Dev: `@storybook/react-native`, `@storybook/react-native-web-vite`, `storybook`,
`jest`, `jest-expo`, `@testing-library/react-native`, `react-test-renderer` (if the
RTL version still needs it).

Versions are pinned to the current stable releases that support Expo 57 / RN 0.86 /
React 19; compatibility is verified at install time, not assumed. Expo packages are
added with `expo install` so they match the SDK.

## Assumptions

- `expo-sqlite/kv-store` exposes synchronous `getItemSync`/`setItemSync` in SDK 57
  (it has since SDK 52). If not, the storage adapter falls back to async read with
  `'system'` as the initial mode; the `ThemeStorage` interface is unchanged.
- `@storybook/react-native` supports portable stories (`composeStories`). If not,
  tests import each story's `args` and render the component directly; the
  "one story = one render test" guarantee holds either way.
