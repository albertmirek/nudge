export type CredentialsValues = { email: string; password: string };
export type CodeValues = { code: string };
export type ResetPasswordValues = { code: string; newPassword: string };
export type FormErrors<V> = Partial<Record<keyof V, string>>;

// Mirrors the server's rules (auth-input.ts) so a valid form never bounces on the API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email';
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Enter your password';
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters`;
  return undefined;
}

function validateCodeText(code: string): string | undefined {
  return /^\d{6}$/.test(code) ? undefined : 'Enter the 6-digit code';
}

function compact<V>(errors: FormErrors<V>): FormErrors<V> {
  return Object.fromEntries(
    Object.entries(errors).filter(([, v]) => v !== undefined),
  ) as FormErrors<V>;
}

export function validateCredentials(values: CredentialsValues): FormErrors<CredentialsValues> {
  return compact({
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  });
}

export function validateEmailOnly(values: { email: string }): FormErrors<{ email: string }> {
  return compact({ email: validateEmail(values.email) });
}

export function validateCode(values: CodeValues): FormErrors<CodeValues> {
  return compact({ code: validateCodeText(values.code) });
}

export function validateResetPassword(
  values: ResetPasswordValues,
): FormErrors<ResetPasswordValues> {
  return compact({
    code: validateCodeText(values.code),
    newPassword: validatePassword(values.newPassword),
  });
}

/** IANA zone for sign-up; Hermes ships full Intl, but never let a missing zone block sign-up. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
