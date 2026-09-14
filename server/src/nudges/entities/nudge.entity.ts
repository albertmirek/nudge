import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { NudgeStatus } from './nudge-status.enum.js';

@Entity({ name: 'nudges' })
@Index('nudges_user_id_status_scheduled_for_idx', ['userId', 'status', 'scheduledFor'])
@Unique('nudges_friend_id_key', ['friendId'])
@Index('nudges_status_scheduled_for_idx', ['status', 'scheduledFor'])
export class Nudge {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'nudges_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.nudges, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nudges_user_id_fkey' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @OneToOne(() => Friend, (friend) => friend.nudge, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'nudges_friend_id_fkey' })
  friend: Relation<Friend>;

  /** UTC instant at which the push should be delivered. */
  @Column({ type: 'timestamptz', name: 'scheduled_for' })
  scheduledFor: Date;

  // Use TypeORM's default enum name: explicitly repeating it causes spurious schema diffs.
  @Column({
    type: 'enum',
    enum: NudgeStatus,
    default: NudgeStatus.PLANNED,
  })
  status: NudgeStatus;

  /** Changes whenever the schedule is changed or invalidated; included in queued jobs. */
  @Column({ type: 'integer', default: 1 })
  revision: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'last_edited_at' })
  lastEditedAt: Date;
}
