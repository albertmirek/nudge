import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Friend } from '@/api/types';
import { useFriends } from '@/api/use-friends';
import { FriendGridItem } from '@/components/friend/friend-grid-item';
import { FriendListRow } from '@/components/friend/friend-list-row';
import { groupByInitial } from '@/lib/friends';
import { type Theme, useStyles } from '@/theme';
import { IconButton, Text } from '@/ui';

type ViewMode = 'grid' | 'list';

const GRID_COLUMNS = 3;

/** Figma "Friend List grid" / "Friend List list": avatars by first name or an A→Z list. */
export function FriendsScreen() {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const friends = useFriends();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const openProfile = (friend: Friend) => router.push(`/friend/${friend.id}`);

  const header = (
    <View style={styles.header}>
      <Text variant="title">Your friend list</Text>
      {viewMode === 'grid' ? (
        <IconButton
          icon="list"
          accessibilityLabel="Show as list"
          onPress={() => setViewMode('list')}
        />
      ) : (
        <IconButton
          icon="grid"
          accessibilityLabel="Show as grid"
          onPress={() => setViewMode('grid')}
        />
      )}
    </View>
  );

  if (friends.isPending) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (friends.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        {header}
        <View style={styles.centered}>
          <Text color="secondary">Couldn&apos;t load your friends. Try again shortly.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const empty = (
    <Text color="secondary" style={styles.empty}>
      No friends yet. Add one to get started.
    </Text>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {viewMode === 'grid' ? (
        <FlatList
          data={groupByInitial(friends.data).flatMap((section) => section.data)}
          keyExtractor={(friend) => friend.id}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.content}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={styles.gridSeparator} />}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <FriendGridItem name={item.name} onPress={() => openProfile(item)} />
            </View>
          )}
          ListEmptyComponent={empty}
        />
      ) : (
        <SectionList
          sections={groupByInitial(friends.data)}
          keyExtractor={(friend) => friend.id}
          contentContainerStyle={styles.content}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={header}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text variant="caption" color="secondary" accessibilityRole="header">
                {section.title}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          renderItem={({ item }) => (
            <FriendListRow name={item.name} onPress={() => openProfile(item)} />
          )}
          ListEmptyComponent={empty}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  content: { paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[6] },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: theme.spacing[5],
  },
  // A fixed share of the row so a partial last row keeps its columns.
  gridCell: { width: `${100 / GRID_COLUMNS}%` as const },
  gridSeparator: { height: theme.spacing[5] },
  sectionHeader: {
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    borderBottomWidth: theme.sizes.border,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing[3],
  },
  listSeparator: { height: theme.spacing[3] },
  empty: { paddingTop: theme.spacing[2] },
});
