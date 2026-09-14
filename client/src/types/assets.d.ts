// Metro resolves image imports to an asset id (number); Vite (web Storybook) to a URL string.
declare module '*.svg' {
  const source: number | string;
  export default source;
}
