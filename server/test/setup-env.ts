import { inject } from 'vitest';

// e2e specs hammer one IP with dozens of requests per file; the real per-route limits would 429 them.
process.env.AUTH_THROTTLE_DISABLED = 'true';

// Runs in every e2e worker before the test file: point the app at the container from global-setup.
process.env.DATABASE_URL = inject('DATABASE_URL');
