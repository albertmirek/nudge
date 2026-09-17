import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';

import { ICON_NAMES, Icon } from './icon';

const meta = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'home' },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = { args: { name: 'book', color: 'secondary' } };

/** Every icon in the set, in the current scheme's primary text colour. */
export const All: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {ICON_NAMES.map((name) => (
        <Icon key={name} name={name} />
      ))}
    </View>
  ),
};
