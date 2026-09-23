import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { signAccessToken } from './access-token.js';
import { AUTH_CONFIG, type AuthConfig } from './auth-config.js';
import { EmailCodesService } from './email-codes.service.js';
import { EmailCodePurpose } from './entities/email-code-purpose.enum.js';
import { hashPassword, needsRehash, verifyPassword } from './password.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  preferredReminderLocalTime: string;
  nudgeEnabled: boolean;
  createdAt: Date;
};

export type SessionResponse = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  user: PublicUser;
};

const INVALID_CODE = 'Invalid or expired code';
const WRONG_CREDENTIALS = 'Wrong email or password';

export function toPublicUser(user: User): PublicUser {
  const { id, email, name, timezone, preferredReminderLocalTime, nudgeEnabled, createdAt } = user;
  return { id, email, name, timezone, preferredReminderLocalTime, nudgeEnabled, createdAt };
}

/** Loads a user including the password hash (excluded from default selects). */
function findByEmailWithHash(manager: EntityManager, email: string): Promise<User | null> {
  return manager
    .getRepository(User)
    .createQueryBuilder('user')
    .addSelect('user.passwordHash')
    .where('user.email = :email', { email })
    .getOne();
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @Inject(RefreshTokensService) private readonly refreshTokens: RefreshTokensService,
    @Inject(EmailCodesService) private readonly codes: EmailCodesService,
  ) {}

  async signUp(input: { email: string; password: string; timezone: string }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOneBy(User, { email: input.email });
      if (existing?.emailVerifiedAt) throw new ConflictException('Email is already registered');
      const passwordHash = await hashPassword(input.password);
      const user = existing
        ? await manager.save(
            User,
            Object.assign(existing, { passwordHash, timezone: input.timezone }),
          )
        : await manager.save(
            User,
            manager.create(User, { email: input.email, timezone: input.timezone, passwordHash }),
          );
      await this.codes.issue(manager, user, EmailCodePurpose.VERIFY_EMAIL);
    });
  }

  async verifyEmail(input: { email: string; code: string }): Promise<SessionResponse> {
    // A failed attempt must still count even though the call as a whole fails, so the transaction
    // always commits; the caller decides whether to throw based on the returned outcome instead of
    // throwing from inside the transaction, which would roll back the consume()'s attempt increment.
    const session = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { email: input.email });
      const ok =
        !!user &&
        (await this.codes.consume(manager, user.id, EmailCodePurpose.VERIFY_EMAIL, input.code));
      if (!user || !ok) return null;
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
        await manager.save(User, user);
      }
      return this.session(manager, user);
    });
    if (!session) throw new BadRequestException(INVALID_CODE);
    return session;
  }

  async resendVerification(input: { email: string }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { email: input.email });
      if (!user || user.emailVerifiedAt) return;
      await this.codes.issue(manager, user, EmailCodePurpose.VERIFY_EMAIL);
    });
  }

  async signIn(input: { email: string; password: string }): Promise<SessionResponse> {
    // Same rule as verifyEmail: the "unverified" branch issues a fresh code that must survive even
    // though sign-in ultimately fails, so we never throw from inside the transaction here.
    type Outcome =
      { kind: 'invalid' } | { kind: 'unverified' } | { kind: 'ok'; session: SessionResponse };
    const outcome = await this.dataSource.transaction<Outcome>(async (manager) => {
      const user = await findByEmailWithHash(manager, input.email);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        return { kind: 'invalid' };
      }
      if (!user.emailVerifiedAt) {
        await this.codes.issue(manager, user, EmailCodePurpose.VERIFY_EMAIL);
        return { kind: 'unverified' };
      }
      if (needsRehash(user.passwordHash)) {
        await manager.update(
          User,
          { id: user.id },
          { passwordHash: await hashPassword(input.password) },
        );
      }
      return { kind: 'ok', session: await this.session(manager, user) };
    });
    if (outcome.kind === 'invalid') throw new UnauthorizedException(WRONG_CREDENTIALS);
    if (outcome.kind === 'unverified') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Email not verified',
        error: 'Forbidden',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    return outcome.session;
  }

  async refresh(input: { refreshToken: string }): Promise<SessionResponse> {
    // rotate() revokes every session for the user when it detects a replayed (already-consumed)
    // token; that revocation must persist even though refresh() then reports failure, so the
    // transaction always commits and the caller throws afterwards based on the outcome.
    const session = await this.dataSource.transaction(async (manager) => {
      const rotated = await this.refreshTokens.rotate(manager, input.refreshToken);
      if (!rotated) return null;
      const user = await manager.findOneByOrFail(User, { id: rotated.userId });
      return this.session(manager, user, rotated.token);
    });
    if (!session) throw new UnauthorizedException('Session expired');
    return session;
  }

  async signOut(input: { refreshToken: string }): Promise<void> {
    await this.dataSource.transaction((manager) =>
      this.refreshTokens.revoke(manager, input.refreshToken),
    );
  }

  async forgotPassword(input: { email: string }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { email: input.email });
      if (!user) return;
      await this.codes.issue(manager, user, EmailCodePurpose.RESET_PASSWORD);
    });
  }

  async resetPassword(input: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<SessionResponse> {
    // Same rule as verifyEmail: a wrong code's attempt increment must persist, so we never throw
    // from inside the transaction.
    const session = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { email: input.email });
      const ok =
        !!user &&
        (await this.codes.consume(manager, user.id, EmailCodePurpose.RESET_PASSWORD, input.code));
      if (!user || !ok) return null;
      user.passwordHash = await hashPassword(input.newPassword);
      // Proving control of the mailbox is at least as strong as the verification code.
      user.emailVerifiedAt ??= new Date();
      await manager.save(User, user);
      await this.refreshTokens.revokeAllForUser(manager, user.id);
      return this.session(manager, user);
    });
    if (!session) throw new BadRequestException(INVALID_CODE);
    return session;
  }

  private async session(
    manager: EntityManager,
    user: User,
    refreshToken?: string,
  ): Promise<SessionResponse> {
    const now = new Date();
    return {
      accessToken: await signAccessToken(this.config, user.id, now),
      accessTokenExpiresAt: new Date(now.getTime() + this.config.accessTokenTtlSeconds * 1000),
      refreshToken: refreshToken ?? (await this.refreshTokens.issue(manager, user.id, now)),
      user: toPublicUser(user),
    };
  }
}
