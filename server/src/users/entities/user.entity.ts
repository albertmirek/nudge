import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity.js';
import { Nudge } from '../../nudges/entities/nudge.entity.js';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'users_pkey' })
  id: string;

  @Column({ type: 'text', default: '' })
  name: string;

  /** Lower-cased and trimmed before storage; the unique constraint is on the stored value. */
  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'timestamptz', name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date | null;

  /** scrypt PHC-style string (see auth/password.ts). Null for future social-only accounts. */
  @Column({ type: 'text', name: 'password_hash', nullable: true, select: false })
  passwordHash: string | null;

  /** IANA zone name (e.g. "Europe/Prague"); the scheduler resolves reminder times per date. */
  @Column({ type: 'text' })
  timezone: string;

  /** Local wall-clock time of day, "HH:MM:SS". */
  @Column({ type: 'time', name: 'preferred_reminder_local_time', default: '18:00:00' })
  preferredReminderLocalTime: string;

  /** Master switch; individual friends have their own flag. */
  @Column({ type: 'boolean', name: 'nudge_enabled', default: true })
  nudgeEnabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Friend, (friend) => friend.user)
  friends: Relation<Friend[]>;

  @OneToMany(() => Nudge, (nudge) => nudge.user)
  nudges: Relation<Nudge[]>;
}
