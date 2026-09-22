import { Injectable, Logger } from '@nestjs/common';
import { EmailService, type EmailMessage } from './email.service.js';

/** Local development without a Resend account: the code ends up in the server log. */
@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger('Email');

  send(message: EmailMessage): Promise<void> {
    this.logger.log(`To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    return Promise.resolve();
  }
}
