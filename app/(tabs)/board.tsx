import { TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { TOUR_FLAG } from '@/app/(auth)/onboarding/welcome-tour';
import { Spacing } from '@/constants/theme';

export default function BoardScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(TOUR_FLAG);
    router.replace('/(auth)/auth');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
          <ThemedText type="small" themeColor="textSecondary">Sign Out</ThemedText>
        </TouchableOpacity>
        <ThemedText type="subtitle">Personal Board</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Coming in Phase 8 — your voting history and worldview insights.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: Spacing.four, gap: Spacing.two },
});
