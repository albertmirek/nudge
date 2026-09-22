import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { SessionProvider } from '@/auth/session';

import { SignOutButton } from './sign-out-button';

// `SignOutButton` always calls `useSignOut()`, which reads `useSession()` internally, even
// though stories override the click behaviour via the `signOut` prop — so it still needs a
// `SessionProvider` (and the `QueryClientProvider` that provider depends on) to render at all.
const withSession: Decorator = (Story) => {
  const client = new QueryClient();
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <Story />
      </SessionProvider>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Components/Settings/SignOutButton',
  component: SignOutButton,
  decorators: [withSession],
  args: { signOut: fn() },
} satisfies Meta<typeof SignOutButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
