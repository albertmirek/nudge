import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [tab, setTab] = useState<NudgeTab>('overdue');
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());

  const me = useMe();
  const friends = useFriends();

  const toggle = (id: string, checked: boolean) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
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
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
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
            checked={checkedIds.has(item.id)}
            onCheckedChange={(checked) => toggle(item.id, checked)}
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
