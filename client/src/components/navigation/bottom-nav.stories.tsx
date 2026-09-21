import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { BottomNav, type BottomNavProps } from './bottom-nav';

const meta = {
  title: 'Components/BottomNav',
  component: BottomNav,
  args: { active: 'index', onNavigate: fn() },
} satisfies Meta<typeof BottomNav>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CreateFriendActive: Story = { args: { active: 'create-friend' } };

/** Friend profile: no tab selected, the lime "Contact" disc in place of "+". */
export const WithAction: Story = {
  args: { active: undefined, action: { label: 'Contact', onPress: fn() } },
};

export const WithActionLoading: Story = {
  args: { active: undefined, action: { label: 'Contact', onPress: fn(), loading: true } },
};

function InteractiveNav(args: BottomNavProps) {
  const [active, setActive] = useState(args.active);
  return <BottomNav {...args} active={active} onNavigate={setActive} />;
}

export const Interactive: Story = { render: (args) => <InteractiveNav {...args} /> };
