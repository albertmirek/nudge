import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Button } from '@/ui';

import { NoteModal, type NoteModalProps } from './note-modal';

const meta = {
  title: 'Components/NoteModal',
  component: NoteModal,
  args: { visible: true, onSave: fn(), onClose: fn() },
} satisfies Meta<typeof NoteModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = { args: { initialNote: 'Long call about her move to Athens' } };

export const Saving: Story = { args: { initialNote: 'Long call', saving: true } };

export const WithError: Story = {
  args: { initialNote: 'Long call', error: 'Could not save the note. Try again.' },
};

function InteractiveModal(args: NoteModalProps) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Button label="Open note" onPress={() => setVisible(true)} />
      <NoteModal
        {...args}
        visible={visible}
        onClose={() => setVisible(false)}
        onSave={() => setVisible(false)}
      />
    </>
  );
}

/** Open and dismiss it on the device/browser. */
export const Interactive: Story = {
  args: { visible: false },
  render: (args) => <InteractiveModal {...args} />,
};
