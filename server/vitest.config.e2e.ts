import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // One shared database per run: keep files sequential so truncation in one file
    // cannot race another file's inserts.
    fileParallelism: false,
    // First run pulls postgres:17-alpine; container start is a few seconds afterwards.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
