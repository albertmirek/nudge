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

/** One row per signed-in device. The opaque token itself is never stored, only its sha256. */
@Entity({ name: 'refresh_tokens' })
@Index('refresh_tokens_user_id_idx', ['userId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'refresh_tokens_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'refresh_tokens_user_id_fkey' })
  user: Relation<User>;

  @Column({ type: 'text', name: 'token_hash', unique: true })
  tokenHash: string;

  /** Start of the session; the absolute cap is measured from here and survives rotation. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  /** Sliding idle deadline, pushed forward on every rotation. */
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;
}
