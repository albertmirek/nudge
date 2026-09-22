import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailService } from './console-email.service.js';
import { EmailService } from './email.service.js';
import { ResendEmailService } from './resend-email.service.js';

@Global()
@Module({
  providers: [
    {
      provide: EmailService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailService => {
        const apiKey = config.get<string>('RESEND_API_KEY') ?? '';
        const from = config.get<string>('EMAIL_FROM') ?? 'Nudge <no-reply@example.com>';
        if (apiKey) return new ResendEmailService(apiKey, from);
        if (process.env.NODE_ENV === 'production') {
          throw new Error('RESEND_API_KEY is required in production');
        }
        new Logger('Email').warn('RESEND_API_KEY is empty; emails are logged to the console');
        return new ConsoleEmailService();
      },
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
