import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  codeInput,
  credentialsInput,
  emailInput,
  refreshTokenInput,
  resetPasswordInput,
  signUpInput,
} from './auth-input.js';
import { AuthService } from './auth.service.js';

const STRICT = { default: { limit: 10, ttl: 60_000 } };
const RELAXED = { default: { limit: 60, ttl: 60_000 } };

/** Public endpoints; everything else on the API requires a bearer token (see AuthMiddleware). */
@Controller('v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('sign-up')
  @HttpCode(201)
  @Throttle(STRICT)
  async signUp(@Body() body: unknown) {
    await this.auth.signUp(signUpInput(body));
    return {};
  }

  @Post('verify-email')
  @HttpCode(200)
  @Throttle(STRICT)
  verifyEmail(@Body() body: unknown) {
    return this.auth.verifyEmail(codeInput(body));
  }

  @Post('resend-verification')
  @HttpCode(204)
  @Throttle(STRICT)
  resendVerification(@Body() body: unknown) {
    return this.auth.resendVerification(emailInput(body));
  }

  @Post('sign-in')
  @HttpCode(200)
  @Throttle(STRICT)
  signIn(@Body() body: unknown) {
    return this.auth.signIn(credentialsInput(body));
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(RELAXED)
  refresh(@Body() body: unknown) {
    return this.auth.refresh(refreshTokenInput(body));
  }

  @Post('sign-out')
  @HttpCode(204)
  @Throttle(RELAXED)
  signOut(@Body() body: unknown) {
    return this.auth.signOut(refreshTokenInput(body));
  }

  @Post('forgot-password')
  @HttpCode(204)
  @Throttle(STRICT)
  forgotPassword(@Body() body: unknown) {
    return this.auth.forgotPassword(emailInput(body));
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle(STRICT)
  resetPassword(@Body() body: unknown) {
    return this.auth.resetPassword(resetPasswordInput(body));
  }
}
