import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Nudge } from '../../nudges/entities/nudge.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { CatchUp } from './catch-up.entity.js';
import { Channel } from './channel.entity.js';
import { FriendPeriodicity } from './friend-periodicity.enum.js';

@Entity({ name: 'friends' })
@Index('friends_user_id_idx', ['userId'])
export class Friend {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'friends_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.friends, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'friends_user_id_fkey' })
  user: User;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'enum', enum: FriendPeriodicity, enumName: 'friends_periodicity_enum' })
  periodicity: FriendPeriodicity;

  @Column({ type: 'timestamptz', name: 'last_contact_at', nullable: true })
  lastContactAt: Date | null;

  @Column({ type: 'boolean', name: 'nudge_enabled', default: true })
  nudgeEnabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Channel, (channel) => channel.friend)
  channels: Channel[];

  @OneToMany(() => CatchUp, (catchUp) => catchUp.friend)
  catchUps: CatchUp[];

  @OneToMany(() => Nudge, (nudge) => nudge.friend)
  nudges: Nudge[];
}
