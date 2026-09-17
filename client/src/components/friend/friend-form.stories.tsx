import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { emptyFriendForm, validateFriendForm } from '@/lib/friend-form';

import { FriendForm, type FriendFormProps } from './friend-form';

const meta = {
  title: 'Components/FriendForm',
  component: FriendForm,
  args: { values: emptyFriendForm(), onChange: fn(), onPickPhoto: fn() },
} satisfies Meta<typeof FriendForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    values: {
      name: 'Anastasia Kleisioni',
      periodicity: 'MONTHLY',
      lastContactAt: '2026-08-01',
      metAt: 'Erasmus in Lisbon',
      livesIn: 'Athens',
      birthday: '1996-03-12',
      notes: 'Loves hiking. Ask about the new job.',
    },
  },
};

export const WithErrors: Story = {
  args: {
    values: { ...emptyFriendForm(), birthday: '12.03.1996' },
    errors: validateFriendForm(
      { ...emptyFriendForm(), birthday: '12.03.1996' },
      new Date('2026-09-17'),
    ),
  },
};

function InteractiveForm(args: FriendFormProps) {
  const [values, setValues] = useState(args.values);
  return <FriendForm {...args} values={values} onChange={setValues} />;
}

/** Fill it in on the device/browser. */
export const Interactive: Story = { render: (args) => <InteractiveForm {...args} /> };
