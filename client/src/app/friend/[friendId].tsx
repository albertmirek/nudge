import { useLocalSearchParams } from 'expo-router';

import { FriendDetailScreen } from '@/screens/friend-detail-screen';

/** `/friend/:friendId`, pushed from a contact row; a stack route so it sits above the tabs. */
export default function FriendRoute() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  return <FriendDetailScreen friendId={friendId} />;
}
