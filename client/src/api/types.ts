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
  createdAt: string;
  updatedAt: string;
  nudge: Nudge | null;
};

export type Me = {
  id: string;
  name: string;
  timezone: string;
  preferredReminderLocalTime: string;
  nudgeEnabled: boolean;
  createdAt: string;
};
