import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { EmailCodePurpose } from './email-code-purpose.enum.js';

/** A 6-digit code emailed for verification or password reset; stored hashed, single use. */
@Entity({ name: 'email_codes' })
@Index('email_codes_user_id_purpose_idx', ['userId', 'purpose'])
export class EmailCode {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'email_codes_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'email_codes_user_id_fkey' })
  user: Relation<User>;

  @Column({ type: 'enum', enum: EmailCodePurpose, enumName: 'email_code_purpose' })
  purpose: EmailCodePurpose;

  @Column({ type: 'text', name: 'code_hash' })
  codeHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  /** Wrong guesses so far; the code is dead after five. */
  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
