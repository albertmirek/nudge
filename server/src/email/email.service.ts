export type EmailMessage = { to: string; subject: string; text: string };

/** Outbound transactional mail. Auth is the only sender for now; keep it plain text. */
export abstract class EmailService {
  abstract send(message: EmailMessage): Promise<void>;
}
