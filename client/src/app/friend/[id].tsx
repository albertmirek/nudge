import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

/** Placeholder for the friend profile; the real screen lands with its own design. */
export default function FriendProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="title">Friend profile</Text>
        <Text color="secondary">Profile for friend {id} is coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { gap: theme.spacing[3], padding: theme.spacing[5] },
});
