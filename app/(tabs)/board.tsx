import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalBoard } from '@/hooks/usePersonalBoard';
import { StatCards } from '@/components/board/StatCards';
import { VotingHistory } from '@/components/board/VotingHistory';
import { EmptyState } from '@/components/shared/EmptyState';
import { Toast } from '@/components/shared/Toast';

export default function BoardScreen() {
  const colors = useColors();
  const { signOut } = useAuth();
  const { data, loading, refreshing, error, refetch } = usePersonalBoard();
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'info' } | null>(null);

  async function handleSignOut() {
    await signOut();
  }

  const onRefresh = () => {
    refetch().catch(() => {
      setToast({ message: "Couldn't refresh your board. Please try again.", variant: 'error' });
    });
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
    />
  );

  if (!loading && error && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
          >
            <EmptyState
              icon="person-outline"
              heading="Couldn't load your board"
              subtext="Pull down to try again"
              button={{ label: 'Try Again', onPress: () => refetch() }}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Your Board</Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              No name. Just your opinions.
            </Text>
          </View>

          <View style={styles.section}>
            <StatCards stats={data?.stats ?? null} loading={loading && !data} />
          </View>

          <View style={styles.section}>
            <VotingHistory history={data?.vote_history ?? []} loading={loading && !data} />
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.6}>
            <Text style={[styles.signOutText, { color: colors.textTertiary }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          visible={!!toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  emptyContent: { flex: 1 },
  header: { gap: 4 },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  section: { gap: 0 },
  signOutBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  signOutText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
});
