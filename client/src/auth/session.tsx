import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { signOut as signOutRequest } from '@/api/auth';
import { clearAccessToken, onSessionLost, setAccessToken } from '@/api/http';
import type { SessionResponse } from '@/api/types';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/auth/token-store';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export type SessionContextValue = {
  status: SessionStatus;
  signIn: (response: SessionResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * "Signed in" means a refresh token is stored; no network call happens at start-up, so cold
 * start is instant and works offline. The HTTP layer obtains access tokens lazily and reports
 * a definitively dead session through onSessionLost.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    getRefreshToken().then((token) => {
      if (!cancelled) setStatus(token ? 'signedIn' : 'signedOut');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onSessionLost(() => {
        queryClient.clear();
        setStatus('signedOut');
      }),
    [queryClient],
  );

  const signIn = useCallback(
    async (response: SessionResponse) => {
      await setRefreshToken(response.refreshToken);
      setAccessToken(response.accessToken, response.accessTokenExpiresAt);
      queryClient.setQueryData(['me'], response.user);
      setStatus('signedIn');
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      // Best effort: the local sign-out must succeed even when the server is unreachable.
      await signOutRequest({ refreshToken }).catch(() => undefined);
    }
    clearAccessToken();
    await clearRefreshToken();
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
