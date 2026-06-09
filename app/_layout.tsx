import 'react-native-url-polyfill/auto';
import { useEffect, useState, useMemo } from 'react';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/hooks/useAuth';
import { PollStateProvider } from '@/contexts/PollStateContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Persister is user-scoped — new key on every user change so caches never bleed across accounts
  const userId = session?.user?.id ?? null;
  const persister = useMemo(
    () => createAsyncStoragePersister({
      storage: AsyncStorage,
      key: `tq-cache-${userId ?? 'anonymous'}`,
      throttleTime: 1000,
    }),
    [userId],
  );

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keep splash visible while fonts load
  if (!fontsLoaded && !fontError) return null;

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? formatAuthError(error.message) : null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? formatAuthError(error.message) : null };
  }

  async function signOut() {
    const prevUserId = session?.user?.id ?? null;
    await supabase.auth.signOut();
    queryClient.clear();
    // Remove the signed-out user's persisted cache from disk
    if (prevUserId) {
      AsyncStorage.removeItem(`tq-cache-${prevUserId}`).catch(() => {});
    }
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      <AuthContext.Provider
        value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}
      >
        <PollStateProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </PollStateProvider>
      </AuthContext.Provider>
    </PersistQueryClientProvider>
  );
}

function formatAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Wrong email or password.';
  if (message.includes('already registered')) return 'An account with this email already exists.';
  if (message.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (message.includes('rate limit') || message.includes('too many')) return 'Too many attempts — wait a moment and try again.';
  return message;
}
