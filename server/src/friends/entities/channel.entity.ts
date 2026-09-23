import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { channelLink } from '../channel-rules.js';
import { ChannelType } from './channel-type.enum.js';
import { Friend } from './friend.entity.js';

@Entity({ name: 'channels' })
@Index('channels_friend_id_idx', ['friendId'])
@Unique('channels_friend_id_type_handle_key', ['friendId', 'type', 'handle'])
@Check('channels_deep_link_check', `("type" = 'OTHER') = ("deep_link" IS NOT NULL)`)
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

  /** E.164 phone, username (no @), email, or for OTHER a free-text label. */
  @Column({ type: 'text' })
  handle: string;

  /** Only for OTHER: the user-supplied URL. Every other type derives its link from `handle`. */
  @Column({ type: 'text', name: 'deep_link', nullable: true })
  deepLink: string | null;

  /** Not a column: the URL that opens the conversation, recomputed whenever the row is read or written. */
  link: string;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  computeLink(): void {
    this.link = channelLink(this.type, this.handle, this.deepLink);
  }
}
