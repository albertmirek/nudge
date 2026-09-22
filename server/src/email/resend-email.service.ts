import { Injectable, Logger } from '@nestjs/common';
import { EmailService, type EmailMessage } from './email.service.js';

const ENDPOINT = 'https://api.resend.com/emails';

@Injectable()
export class ResendEmailService extends EmailService {
  private readonly logger = new Logger('Email');

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Resend responded ${response.status}: ${body}`);
      throw new Error(`Resend responded ${response.status}`);
    }
  }
}
