import { useLocalSearchParams } from 'expo-router';

import { VerifyEmailScreen } from '@/screens/verify-email-screen';

export default function VerifyEmailRoute() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  return <VerifyEmailScreen email={email} />;
}
