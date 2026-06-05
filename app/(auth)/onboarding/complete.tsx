import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SEED_POLLS = [
  { question: 'Is pineapple acceptable on pizza?', category: 'culture' },
  { question: 'Should the voting age be lowered to 16?', category: 'politics' },
  { question: "Is it ever okay to lie to protect someone's feelings?", category: 'ethics' },
  { question: 'Would you rather have more money or more time?', category: 'hypothetical' },
  { question: 'Should there be a 4-day work week?', category: 'culture' },
];

type Vote = 1 | -1;

export default function CompleteScreen() {
  const theme = useTheme();
  const { data } = useOnboarding();
  const { user } = useAuth();
  const [votes, setVotes] = useState<Record<number, Vote>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleVote(index: number, value: Vote) {
    setVotes(prev => ({ ...prev, [index]: value }));
  }

  async function handleGetStarted() {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      phone_hash: `email:${user.id}`,
      age_range: data.age_range ?? '18-24',
      gender: data.gender ?? null,
      region: data.region ?? 'US',
      region_detail: data.region_detail ?? null,
      political_lean: data.political_lean ?? 0,
      income_bracket: data.income_bracket ?? null,
      education_level: data.education_level ?? null,
    });

    setSubmitting(false);

    if (insertError) {
      setError('Something went wrong. Please try again.');
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={7} total={7} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <ThemedText type="subtitle" style={styles.headline}>
              You're in.
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subline}>
              No name. No photo. Just your opinion.
            </ThemedText>
          </View>

          <ThemedText type="default" style={styles.pollsLabel}>
            Cast your first votes:
          </ThemedText>

          <View style={styles.polls}>
            {SEED_POLLS.map((poll, i) => (
              <SeedPollCard
                key={i}
                question={poll.question}
                category={poll.category}
                vote={votes[i] ?? null}
                onVote={v => toggleVote(i, v)}
              />
            ))}
          </View>

          {error ? (
            <ThemedText type="small" style={styles.error}>{error}</ThemedText>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleGetStarted}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Get Started</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

type SeedPollCardProps = {
  question: string;
  category: string;
  vote: Vote | null;
  onVote: (v: Vote) => void;
};

function SeedPollCard({ question, category, vote, onVote }: SeedPollCardProps) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.cardCategory}>
        {category.toUpperCase()}
      </ThemedText>
      <ThemedText type="default" style={styles.cardQuestion}>{question}</ThemedText>
      <View style={styles.voteRow}>
        <TouchableOpacity
          style={[
            styles.voteBtn,
            { borderColor: vote === 1 ? '#208AEF' : theme.backgroundSelected },
            vote === 1 && styles.voteBtnAgree,
          ]}
          onPress={() => onVote(1)}
          activeOpacity={0.75}
        >
          <ThemedText
            type="small"
            style={[styles.voteBtnText, { color: vote === 1 ? '#fff' : theme.text }]}
          >
            AGREE
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.voteBtn,
            { borderColor: vote === -1 ? '#FF453A' : theme.backgroundSelected },
            vote === -1 && styles.voteBtnDisagree,
          ]}
          onPress={() => onVote(-1)}
          activeOpacity={0.75}
        >
          <ThemedText
            type="small"
            style={[styles.voteBtnText, { color: vote === -1 ? '#fff' : theme.text }]}
          >
            DISAGREE
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  headline: { textAlign: 'center' },
  subline: { textAlign: 'center' },
  pollsLabel: {
    paddingHorizontal: Spacing.four,
    fontWeight: '600',
    marginTop: Spacing.two,
  },
  polls: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardCategory: { letterSpacing: 0.8 },
  cardQuestion: { fontWeight: '600', lineHeight: 22 },
  voteRow: { flexDirection: 'row', gap: Spacing.two },
  voteBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteBtnAgree: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  voteBtnDisagree: { backgroundColor: '#FF453A', borderColor: '#FF453A' },
  voteBtnText: { fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  error: { color: '#FF453A', textAlign: 'center', paddingHorizontal: Spacing.four },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
