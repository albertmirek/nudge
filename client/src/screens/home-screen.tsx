import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Friend } from '@/api/types';
import { useConfirmNudge } from '@/api/use-confirm-nudge';
import { useFriends } from '@/api/use-friends';
import { useMe } from '@/api/use-me';
import { ContactRow } from '@/components/contact/contact-row';
import { NudgeTabs, type NudgeTab } from '@/components/home/nudge-tabs';
import { TickerBanner } from '@/components/home/ticker-banner';
import { splitByNudge } from '@/lib/nudges';
import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

function summaryFor(overdueCount: number): string {
  if (overdueCount === 0) return "You're all caught up!";
  return `You have ${overdueCount} check-in${overdueCount === 1 ? '' : 's'} overdue now`;
}

export function HomeScreen() {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const [tab, setTab] = useState<NudgeTab>('overdue');
  // Friends whose nudge confirmation is in flight; the row shows checked until the friends
  // list refetches and the friend moves out of the current tab's bucket.
  const [confirmingIds, setConfirmingIds] = useState<ReadonlySet<string>>(new Set());
  // Captured once per mount so every row's relative-date label stays consistent, rather than
  // each row computing its own `new Date()` at its own render time.
  const [now] = useState(() => new Date());

  const me = useMe();
  const friends = useFriends();
  const confirmNudge = useConfirmNudge();

  const confirm = (friend: Friend) => {
    if (!friend.nudge) return;
    const friendId = friend.id;
    setConfirmingIds((current) => new Set(current).add(friendId));
    confirmNudge.mutate(
      { nudgeId: friend.nudge.id, revision: friend.nudge.revision },
      {
        onSettled: () => {
          setConfirmingIds((current) => {
            const next = new Set(current);
            next.delete(friendId);
            return next;
          });
        },
      },
    );
  };

  if (me.isPending || friends.isPending) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (me.isError || friends.isError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Text color="secondary">Couldn&apos;t load your nudges. Try again shortly.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { overdue, upcoming } = splitByNudge(friends.data);
  const visible = tab === 'overdue' ? overdue : upcoming;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <TickerBanner text="stay in touch with your friends" />
      <FlatList
        data={visible}
        keyExtractor={(friend) => friend.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="titleRegular">Hello {me.data.name}.</Text>
            <Text variant="title">{summaryFor(overdue.length)}</Text>
            <NudgeTabs value={tab} onChange={setTab} overdueCount={overdue.length} />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ContactRow
            name={item.name}
            lastContactAt={item.lastContactAt ? new Date(item.lastContactAt) : null}
            nudgeDueAt={tab === 'upcoming' && item.nudge ? new Date(item.nudge.scheduledFor) : null}
            checked={confirmingIds.has(item.id)}
            onCheckedChange={(checked) => checked && confirm(item)}
            onPress={() => router.push(`/friend/${item.id}`)}
            now={now}
          />
        )}
        ListEmptyComponent={
          <Text color="secondary" style={styles.empty}>
            {tab === 'overdue' ? 'Nothing overdue right now.' : 'No upcoming check-ins yet.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  content: { paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[6] },
  header: { gap: theme.spacing[3], paddingVertical: theme.spacing[5] },
  separator: { height: theme.spacing[5] },
  empty: { paddingTop: theme.spacing[5] },
});
