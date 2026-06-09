import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { VoteButtons } from '@/components/poll/VoteButtons';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/lib/supabase';
import type { PollType } from '@/types/app';

type SeedPollData = {
  question: string;
  category: string;
  pollType: PollType;
  optionA?: string;
  optionB?: string;
};

const SEED_POLLS: SeedPollData[] = [
  { question: 'Is pineapple acceptable on pizza?', category: 'culture', pollType: 'binary' },
  { question: 'Should the voting age be lowered to 16?', category: 'politics', pollType: 'binary' },
  { question: "Is it ever okay to lie to protect someone's feelings?", category: 'ethics', pollType: 'binary' },
  { question: 'Would you rather have more money or more time?', category: 'hypothetical', pollType: 'versus', optionA: 'More money', optionB: 'More time' },
  { question: 'Should there be a 4-day work week?', category: 'culture', pollType: 'binary' },
];

type Vote = 1 | -1;

export default function CompleteScreen() {
  const colors = useColors();
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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
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

    const { error: insertError } = await supabase.from('users').insert(payload);

    setSubmitting(false);

    if (insertError) {
      if (insertError.code === '23505') {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={7} total={7} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={[styles.headline, { color: colors.text }]}>You're in.</Text>
            <Text style={[styles.subline, { color: colors.textSecondary }]}>
              No name. No photo. Just your opinion.
            </Text>
          </View>

          <View style={styles.pollsHeader}>
            <Text style={[styles.pollsLabel, { color: colors.text }]}>Cast your first votes:</Text>
            <TouchableOpacity onPress={() => setShowPolls(v => !v)} activeOpacity={0.7}>
              <Text style={[styles.pollsToggle, { color: colors.textSecondary }]}>
                {showPolls ? 'Skip' : 'Show'}
              </Text>
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
                  colors={colors}
                />
              ))}
            </View>
          )}

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }, submitting && styles.buttonDisabled]}
            onPress={handleGetStarted}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.accentText }]}>Get Started</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
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
  colors: ReturnType<typeof useColors>;
};

function SeedPollCard({ question, category, pollType, optionA, optionB, vote, onVote, colors }: SeedPollCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
        {category.toUpperCase()}
      </Text>
      <Text style={[styles.cardQuestion, { color: colors.text }]}>{question}</Text>
      <VoteButtons
        pollType={pollType}
        optionA={optionA}
        optionB={optionB}
        userVote={vote}
        onVote={onVote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 16 },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    textAlign: 'center',
  },
  subline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  pollsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  pollsLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  pollsToggle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    paddingLeft: 12,
  },
  polls: { gap: 8, paddingHorizontal: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 12,
    gap: 8,
  },
  cardCategory: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  cardQuestion: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
