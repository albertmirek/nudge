export type NudgeStatus = 'PLANNED' | 'SNOOZED' | 'SENT' | 'CONFIRMED';

export type Nudge = {
  id: string;
  scheduledFor: string;
  status: NudgeStatus;
  revision: number;
  lastEditedAt: string;
};

export type FriendPeriodicity = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';

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

export type Me = {
  id: string;
  name: string;
  timezone: string;
  preferredReminderLocalTime: string;
  nudgeEnabled: boolean;
  createdAt: string;
};
