import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactRow } from '@/components/contact/contact-row';
import { ThemeModePicker } from '@/components/settings/theme-mode-picker';
import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/** Placeholder data until the contacts API is wired through React Query. */
const CONTACTS = [
  { id: '1', name: 'Anastasia Kleisioni', lastContactAt: daysAgo(288) },
  { id: '2', name: 'Aku Koskien', lastContactAt: daysAgo(12) },
  { id: '3', name: 'Borbála Varga', lastContactAt: daysAgo(0) },
  { id: '4', name: 'Elia Cagnazo', lastContactAt: daysAgo(45) },
];

export default function ContactsScreen() {
  const styles = useStyles(makeStyles);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string, checked: boolean) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={CONTACTS}
        keyExtractor={(contact) => contact.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title">Your friend list</Text>
            <ThemeModePicker />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ContactRow
            name={item.name}
            lastContactAt={item.lastContactAt}
            checked={checkedIds.has(item.id)}
            onCheckedChange={(checked) => toggle(item.id, checked)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing[5], paddingBottom: theme.spacing[6] },
  header: { gap: theme.spacing[4], paddingVertical: theme.spacing[5] },
  separator: { height: theme.spacing[5] },
});
