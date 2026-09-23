import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthConfigModule } from './auth/auth-config.module.js';
import { AuthMiddleware } from './auth/auth.middleware.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EmailModule } from './email/email.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { HealthController } from './health/health.controller.js';
import { NudgesModule } from './nudges/nudges.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    // `.env` lives at the repo root; the server's cwd is `server/` when run natively.
    // Inside docker compose the variables come from env_file/environment instead.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    DatabaseModule,
    AuthConfigModule,
    EmailModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    NudgesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
