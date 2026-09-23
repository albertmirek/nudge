import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { IsNull, type EntityManager } from 'typeorm';
import { EmailService } from '../email/email.service.js';
import { EmailCodePurpose } from './entities/email-code-purpose.enum.js';
import { EmailCode } from './entities/email-code.entity.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function codeMessage(
  purpose: EmailCodePurpose,
  code: string,
): { subject: string; text: string } {
  if (purpose === EmailCodePurpose.VERIFY_EMAIL) {
    return {
      subject: 'Verify your Nudge email',
      text: `Your Nudge verification code is ${code}. It expires in 15 minutes.`,
    };
  }
  return {
    subject: 'Reset your Nudge password',
    text: `Your Nudge password reset code is ${code}. It expires in 15 minutes.`,
  };
}

/** Emailed 6-digit codes. The code leaves the server only inside the email. */
@Injectable()
export class EmailCodesService {
  constructor(@Inject(EmailService) private readonly email: EmailService) {}

  async issue(
    manager: EntityManager,
    user: { id: string; email: string },
    purpose: EmailCodePurpose,
    now = new Date(),
  ): Promise<void> {
    // Only the newest code of a purpose is ever valid.
    await manager.update(
      EmailCode,
      { userId: user.id, purpose, consumedAt: IsNull() },
      { consumedAt: now },
    );
    const code = generateCode();
    await manager.insert(EmailCode, {
      userId: user.id,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      attempts: 0,
      consumedAt: null,
    });
    await this.email.send({ to: user.email, ...codeMessage(purpose, code) });
  }

  /** True and consumes the code when it matches; false for anything else (same outward error). */
  async consume(
    manager: EntityManager,
    userId: string,
    purpose: EmailCodePurpose,
    code: string,
    now = new Date(),
  ): Promise<boolean> {
    const row = await manager.findOne(EmailCode, {
      where: { userId, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!row || row.expiresAt.getTime() <= now.getTime() || row.attempts >= MAX_ATTEMPTS) {
      return false;
    }
    // Count the attempt before comparing so a crash between the two cannot grant a free guess.
    await manager.increment(EmailCode, { id: row.id }, 'attempts', 1);
    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(hashCode(code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    await manager.update(EmailCode, { id: row.id }, { consumedAt: now });
    return true;
  }
}
