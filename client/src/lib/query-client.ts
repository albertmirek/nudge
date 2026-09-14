import { QueryClient } from '@tanstack/react-query';

/** Single React Query client for the app. No queries exist yet; screens add hooks under src/api/. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});
