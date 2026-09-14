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
import { Friend } from './friend.entity.js';

@Entity({ name: 'catch_ups' })
@Index('catch_ups_friend_id_created_at_idx', ['friendId', 'createdAt'])
export class CatchUp {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'catch_ups_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.catchUps, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'catch_ups_friend_id_fkey' })
  friend: Relation<Friend>;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
