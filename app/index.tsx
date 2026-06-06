import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type AppRoute =
  | '/(auth)/auth'
  | '/(auth)/onboarding/age'
  | '/(auth)/onboarding/welcome-tour'
  | '/(tabs)';

export default function IndexScreen() {
  const [route, setRoute] = useState<AppRoute | null>(null);

  useEffect(() => {
    async function resolveRoute() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setRoute('/(auth)/auth');
        return;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('id, has_seen_tour')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!userRow) {
        setRoute('/(auth)/onboarding/age');
        return;
      }

      setRoute(userRow.has_seen_tour ? '/(tabs)' : '/(auth)/onboarding/welcome-tour');
    }

    resolveRoute();
  }, []); // runs once on mount — Expo splash screen covers the blank state

  if (!route) return null;
  return <Redirect href={route} />;
}
