import { apiFetch } from '@/api/http';
import type {
  CodeBody,
  CredentialsBody,
  EmailBody,
  ResetPasswordBody,
  SessionResponse,
  SignUpBody,
} from '@/api/types';

function post<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(
    `/v1/auth/${path}`,
    { method: 'POST', body: JSON.stringify(body) },
    { auth: false },
  );
}

export const signUp = (body: SignUpBody) => post<void>('sign-up', body);
export const verifyEmail = (body: CodeBody) => post<SessionResponse>('verify-email', body);
export const resendVerification = (body: EmailBody) => post<void>('resend-verification', body);
export const signIn = (body: CredentialsBody) => post<SessionResponse>('sign-in', body);
export const signOut = (body: { refreshToken: string }) => post<void>('sign-out', body);
export const forgotPassword = (body: EmailBody) => post<void>('forgot-password', body);
export const resetPassword = (body: ResetPasswordBody) =>
  post<SessionResponse>('reset-password', body);
