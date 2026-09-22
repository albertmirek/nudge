export const REFRESH_TOKEN_KEY = 'nudge.refreshToken';

let token: string | null = null;

export async function getRefreshToken(): Promise<string | null> {
  return token;
}

export async function setRefreshToken(value: string): Promise<void> {
  token = value;
}

export async function clearRefreshToken(): Promise<void> {
  token = null;
}
