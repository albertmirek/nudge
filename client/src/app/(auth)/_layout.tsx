import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Sign-in / sign-up flow; sign-in is the entry point, the rest push on top of it. */
export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack
      initialRouteName="sign-in"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
