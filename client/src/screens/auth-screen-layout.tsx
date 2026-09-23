import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, useStyles } from '@/theme';
import { Text } from '@/ui';

export type AuthScreenLayoutProps = { title: string; subtitle?: string; children: ReactNode };

/** Heading + optional one-liner + form, keyboard-aware. Shared by every auth screen. */
export function AuthScreenLayout({ title, subtitle, children }: AuthScreenLayoutProps) {
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Text variant="title">{title}</Text>
            {subtitle ? (
              <Text variant="body" color="secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[5],
  },
  header: { gap: theme.spacing[2], paddingVertical: theme.spacing[5] },
});
