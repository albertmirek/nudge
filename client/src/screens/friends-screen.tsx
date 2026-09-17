import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

/** Placeholder for the friend book list; the real list lands with its own design. */
export function FriendsScreen() {
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="title">Friend book</Text>
        <Text color="secondary">Your friends will be listed here soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { gap: theme.spacing[3], padding: theme.spacing[5] },
});
