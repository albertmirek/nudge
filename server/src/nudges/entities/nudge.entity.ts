import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { NudgeStatus } from './nudge-status.enum.js';

@Entity({ name: 'nudges' })
@Index('nudges_user_id_status_scheduled_for_idx', ['userId', 'status', 'scheduledFor'])
@Index('nudges_friend_id_idx', ['friendId'])
export class Nudge {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'nudges_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.nudges, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nudges_user_id_fkey' })
  user: User;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.nudges, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'nudges_friend_id_fkey' })
  friend: Friend;

  /** UTC instant at which the push should be delivered. */
  @Column({ type: 'timestamptz', name: 'scheduled_for' })
  scheduledFor: Date;

  @Column({
    type: 'enum',
    enum: NudgeStatus,
    enumName: 'nudges_status_enum',
    default: NudgeStatus.PLANNED,
  })
  status: NudgeStatus;
}
