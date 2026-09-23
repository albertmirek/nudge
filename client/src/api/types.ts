export type NudgeStatus = 'PLANNED' | 'SNOOZED' | 'SENT' | 'CONFIRMED';

export type Nudge = {
  id: string;
  scheduledFor: string;
  status: NudgeStatus;
  revision: number;
  lastEditedAt: string;
};

export type FriendPeriodicity = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';

export type ChannelType =
  | 'WHATSAPP'
  | 'TELEGRAM'
  | 'SIGNAL'
  | 'IMESSAGE'
  | 'SMS'
  | 'PHONE'
  | 'EMAIL'
  | 'INSTAGRAM'
  | 'MESSENGER'
  | 'OTHER';

/** A way to reach a friend. `link` is built by the server; the app only opens it. */
export type Channel = {
  id: string;
  type: ChannelType;
  /** E.164 phone, username (no @), email, or for OTHER a label. */
  handle: string;
  /** Only for OTHER. */
  deepLink: string | null;
  link: string;
};

/** POST /v1/friends/:id/channels body; deepLink only (and required) for OTHER. */
export type CreateChannelBody = { type: ChannelType; handle: string; deepLink?: string };

/** PATCH body; the type cannot change. */
export type UpdateChannelBody = Partial<{ handle: string; deepLink: string }>;

/** POST …/channels/:id/open response. */
export type OpenChannelResult = { lastContactAt: string; nudge: Nudge };

export type Friend = {
  id: string;
  name: string;
  periodicity: FriendPeriodicity;
  lastContactAt: string | null;
  nudgeEnabled: boolean;
  metAt: string | null;
  livesIn: string | null;
  /** YYYY-MM-DD, no time zone. */
  birthday: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  nudge: Nudge | null;
  channels: Channel[];
};

/** POST /v1/friends body; every field but name and periodicity is optional. */
export type CreateFriendBody = {
  name: string;
  periodicity: FriendPeriodicity;
  nudgeEnabled?: boolean;
  /** ISO timestamp, not in the future; the first nudge is planned from it. */
  lastContactAt?: string;
  metAt?: string;
  livesIn?: string;
  birthday?: string;
  notes?: string;
};

/** PATCH /v1/friends/:id body: any nonempty subset; null clears a profile field. */
export type UpdateFriendBody = Partial<{
  name: string;
  periodicity: FriendPeriodicity;
  nudgeEnabled: boolean;
  metAt: string | null;
  livesIn: string | null;
  birthday: string | null;
  notes: string | null;
}>;

/** A note about a friend (what you last talked about); independent of contact history. */
export type CatchUp = {
  id: string;
  note: string;
  createdAt: string;
};

export type Me = {
  id: string;
  name: string;
  timezone: string;
  preferredReminderLocalTime: string;
  nudgeEnabled: boolean;
  createdAt: string;
};
