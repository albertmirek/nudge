import { EmailCodePurpose } from './entities/email-code-purpose.enum.js';
import { codeMessage, generateCode } from './email-codes.service.js';

describe('email codes', () => {
  it('generates zero-padded six-digit codes', () => {
    for (let i = 0; i < 200; i += 1) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('builds the two plain-text messages', () => {
    expect(codeMessage(EmailCodePurpose.VERIFY_EMAIL, '012345')).toEqual({
      subject: 'Verify your Nudge email',
      text: 'Your Nudge verification code is 012345. It expires in 15 minutes.',
    });
    expect(codeMessage(EmailCodePurpose.RESET_PASSWORD, '999999')).toEqual({
      subject: 'Reset your Nudge password',
      text: 'Your Nudge password reset code is 999999. It expires in 15 minutes.',
    });
  });
});
