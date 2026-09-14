import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { ChannelType } from './channel-type.enum.js';
import { Friend } from './friend.entity.js';

@Entity({ name: 'channels' })
@Index('channels_friend_id_idx', ['friendId'])
export class Channel {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'channels_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.channels, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'channels_friend_id_fkey' })
  friend: Relation<Friend>;

  // Use TypeORM's default enum name: explicitly repeating it causes spurious schema diffs.
  @Column({ type: 'enum', enum: ChannelType })
  type: ChannelType;

  /** App/URL scheme link that opens the conversation (whatsapp://…, tel:…, mailto:…). */
  @Column({ type: 'text', name: 'deep_link' })
  deepLink: string;
}
