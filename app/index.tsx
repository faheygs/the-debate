import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const [checkingUser, setCheckingUser] = useState(true);
  const [hasUserRow, setHasUserRow] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setCheckingUser(false);
      return;
    }

    supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasUserRow(!!data);
        setCheckingUser(false);
      });
  }, [session, loading]);

  if (loading || checkingUser) return null;
  if (!session) return <Redirect href="/(auth)/auth" />;
  if (!hasUserRow) return <Redirect href="/(auth)/onboarding/age" />;
  return <Redirect href="/(tabs)" />;
}
