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
import { VoteButtons } from '@/components/poll/VoteButtons';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';
import type { PollType } from '@/types/app';

type SeedPollData = {
  question: string;
  category: string;
  pollType: PollType;
  optionA?: string;
  optionB?: string;
};

const SEED_POLLS: SeedPollData[] = [
  {
    question: 'Is pineapple acceptable on pizza?',
    category: 'culture',
    pollType: 'binary',
  },
  {
    question: 'Should the voting age be lowered to 16?',
    category: 'politics',
    pollType: 'binary',
  },
  {
    question: "Is it ever okay to lie to protect someone's feelings?",
    category: 'ethics',
    pollType: 'binary',
  },
  {
    question: 'Would you rather have more money or more time?',
    category: 'hypothetical',
    pollType: 'versus',
    optionA: 'More money',
    optionB: 'More time',
  },
  {
    question: 'Should there be a 4-day work week?',
    category: 'culture',
    pollType: 'binary',
  },
];

type Vote = 1 | -1;

export default function CompleteScreen() {
  const { data } = useOnboarding();
  const [votes, setVotes] = useState<Record<number, Vote>>({});
  const [showPolls, setShowPolls] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleVote(index: number, value: Vote) {
    setVotes(prev => ({ ...prev, [index]: value }));
  }

  async function handleGetStarted() {
    setSubmitting(true);
    setError(null);

    // Always get a fresh session — never rely on stale context
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.error('[complete] No active session:', sessionError);
      setError('Session expired. Please sign in again.');
      setSubmitting(false);
      return;
    }

    const userId = session.user.id;

    const payload = {
      id: userId,
      phone_hash: `email:${userId}`,
      age_range: data.age_range ?? null,
      gender: data.gender ?? null,
      region: data.region ?? null,
      region_detail: data.region_detail ?? null,
      political_lean: data.political_lean ?? null,
      income_bracket: data.income_bracket ?? null,
      education_level: data.education_level ?? null,
    };

    console.log('[complete] Inserting user row:', JSON.stringify(payload, null, 2));

    const { error: insertError } = await supabase.from('users').insert(payload);

    setSubmitting(false);

    if (insertError) {
      console.error('[complete] Insert failed — code:', insertError.code);
      console.error('[complete] message:', insertError.message);
      console.error('[complete] details:', insertError.details);
      console.error('[complete] hint:', insertError.hint);

      // Duplicate key: user row already exists (e.g. retry after a crash)
      if (insertError.code === '23505') {
        console.log('[complete] User row already exists — checking tour flag in DB');
        const { data: existingRow } = await supabase
          .from('users')
          .select('has_seen_tour')
          .eq('id', userId)
          .maybeSingle();
        router.replace(existingRow?.has_seen_tour ? '/(tabs)' : '/(auth)/onboarding/welcome-tour');
        return;
      }

      setError(`Setup failed (${insertError.code ?? 'unknown'}): ${insertError.message}`);
      return;
    }

    router.replace('/(auth)/onboarding/welcome-tour');
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

          <View style={styles.pollsHeader}>
            <ThemedText type="default" style={styles.pollsLabel}>
              Cast your first votes:
            </ThemedText>
            <TouchableOpacity onPress={() => setShowPolls(v => !v)} activeOpacity={0.7}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.pollsToggle}>
                {showPolls ? 'Skip' : 'Show'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {showPolls && (
            <View style={styles.polls}>
              {SEED_POLLS.map((poll, i) => (
                <SeedPollCard
                  key={i}
                  question={poll.question}
                  category={poll.category}
                  pollType={poll.pollType}
                  optionA={poll.optionA}
                  optionB={poll.optionB}
                  vote={votes[i] ?? null}
                  onVote={v => toggleVote(i, v)}
                />
              ))}
            </View>
          )}

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
  pollType: PollType;
  optionA?: string;
  optionB?: string;
  vote: Vote | null;
  onVote: (v: Vote) => void;
};

function SeedPollCard({ question, category, pollType, optionA, optionB, vote, onVote }: SeedPollCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.cardCategory}>
        {category.toUpperCase()}
      </ThemedText>
      <ThemedText type="default" style={styles.cardQuestion}>{question}</ThemedText>
      <VoteButtons
        pollType={pollType}
        optionA={optionA}
        optionB={optionB}
        userVote={vote}
        onVote={onVote}
      />
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
  pollsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  pollsLabel: { fontWeight: '600' },
  pollsToggle: { paddingLeft: Spacing.three },
  polls: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardCategory: { letterSpacing: 0.8 },
  cardQuestion: { fontWeight: '600', lineHeight: 22 },
  error: { color: '#F43F5E', textAlign: 'center', paddingHorizontal: Spacing.four },
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
