import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailCodesService } from './email-codes.service.js';
import { EmailCode } from './entities/email-code.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, EmailCode]),
    // Per-IP limits are set per route with @Throttle; routes without it are unlimited.
    // AUTH_THROTTLE_DISABLED short-circuits the guard in e2e tests, which hammer one IP.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 1_000_000 }],
      skipIf: () => process.env.AUTH_THROTTLE_DISABLED === 'true',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokensService,
    EmailCodesService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AuthModule {}
