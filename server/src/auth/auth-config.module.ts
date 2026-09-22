import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG, loadAuthConfig } from './auth-config.js';

/** Provides AUTH_CONFIG globally so AuthModule (and anything else) can inject it. */
@Global()
@Module({
  providers: [{ provide: AUTH_CONFIG, inject: [ConfigService], useFactory: loadAuthConfig }],
  exports: [AUTH_CONFIG],
})
export class AuthConfigModule {}
