import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';

import { Text } from './text';

const meta = {
  title: 'UI/Text',
  component: Text,
  args: { children: 'Anastasia Kleisioni' },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Body: Story = {};

export const BodyLight: Story = { args: { variant: 'bodyLight', children: '288 d ago' } };

export const Title: Story = { args: { variant: 'title', children: 'Your friend list' } };

export const Caption: Story = { args: { variant: 'caption', children: 'Caption' } };

export const Secondary: Story = { args: { color: 'secondary' } };

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text variant="title">Title 28/36</Text>
      <Text variant="body">Body 15/20</Text>
      <Text variant="bodyLight">Body light 12/16</Text>
      <Text variant="caption">Caption 12/16</Text>
      <Text color="secondary">Secondary colour</Text>
    </View>
  ),
};
