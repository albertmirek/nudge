import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createChannel, deleteChannel, openChannel, updateChannel } from '@/api/channels';
import type { CreateChannelBody, UpdateChannelBody } from '@/api/types';

/** Channels live on the friend, so every change refreshes the ['friends'] queries. */
function useFriendsInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['friends'] });
}

export function useCreateChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: (body: CreateChannelBody) => createChannel(friendId, body),
    onSuccess,
  });
}

export function useUpdateChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: ({ channelId, body }: { channelId: string; body: UpdateChannelBody }) =>
      updateChannel(friendId, channelId, body),
    onSuccess,
  });
}

export function useDeleteChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: (channelId: string) => deleteChannel(friendId, channelId),
    onSuccess,
  });
}

/** Records contact after the chat opened; the refetch updates last contact and the nudge. */
export function useOpenChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: (channelId: string) => openChannel(friendId, channelId),
    onSuccess,
  });
}
