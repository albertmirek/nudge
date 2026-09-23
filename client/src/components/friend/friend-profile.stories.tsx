import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import type { Friend } from '@/api/types';
import { friendToProfileValues, validateFriendProfile } from '@/lib/friend-form';

import { FriendProfile, type FriendProfileProps } from './friend-profile';

const FRIEND: Friend = {
  id: 'friend-1',
  name: 'Anastasia Kleisioni',
  periodicity: 'MONTHLY',
  lastContactAt: '2025-01-03T10:00:00Z',
  nudgeEnabled: true,
  metAt: 'Stockholm University',
  livesIn: 'Athens',
  birthday: '2000-07-13',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  nudge: null,
  channels: [],
};

const meta = {
  title: 'Components/FriendProfile',
  component: FriendProfile,
  args: {
    friend: FRIEND,
    editing: false,
    values: friendToProfileValues(FRIEND),
    onChange: fn(),
    onEdit: fn(),
    onSave: fn(),
  },
} satisfies Meta<typeof FriendProfile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NeverContacted: Story = {
  args: { friend: { ...FRIEND, lastContactAt: null, livesIn: null, birthday: null } },
};

export const Editing: Story = { args: { editing: true } };

export const EditingWithErrors: Story = {
  args: {
    editing: true,
    values: { ...friendToProfileValues(FRIEND), name: '', birthday: '13.07.2000' },
    errors: validateFriendProfile({
      ...friendToProfileValues(FRIEND),
      name: '',
      birthday: '13.07.2000',
    }),
  },
};

export const Saving: Story = { args: { editing: true, saving: true } };

function InteractiveProfile(args: FriendProfileProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(args.values);
  return (
    <FriendProfile
      {...args}
      editing={editing}
      values={values}
      onChange={setValues}
      onEdit={() => setEditing(true)}
      onSave={() => setEditing(false)}
    />
  );
}

/** Toggle edit mode on the device/browser. */
export const Interactive: Story = { render: (args) => <InteractiveProfile {...args} /> };
