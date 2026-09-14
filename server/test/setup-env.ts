import { inject } from 'vitest';

// Runs in every e2e worker before the test file: point the app at the container from global-setup.
process.env.DATABASE_URL = inject('DATABASE_URL');
