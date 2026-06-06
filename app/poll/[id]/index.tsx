import { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { VoteButtons } from '@/components/poll/VoteButtons';
import { CommentSection } from '@/components/poll/CommentSection';
import { CommentInput } from '@/components/poll/CommentInput';
import { Toast } from '@/components/shared/Toast';
import { formatVoteCount } from '@/components/shared/VoteCount';
import { usePollDetail } from '@/hooks/usePollDetail';
import { useVote } from '@/hooks/useVote';
import { usePollState } from '@/contexts/PollStateContext';

// ── Category badge colors ─────────────────────────────────────────────────────

const CATEGORY_LIGHT: Record<string, { bg: string; text: string }> = {
  politics:      { bg: '#EEF2FF', text: '#4338CA' },
  culture:       { bg: '#F5F3FF', text: '#7C3AED' },
  food:          { bg: '#FEE2E2', text: '#991B1B' },
  ethics:        { bg: '#FFFBEB', text: '#92400E' },
  sports:        { bg: '#F0FDF4', text: '#166534' },
  tech:          { bg: '#EFF6FF', text: '#1D4ED8' },
  relationships: { bg: '#FDF2F8', text: '#9D174D' },
  hypothetical:  { bg: '#F0FDFA', text: '#0F766E' },
  news:          { bg: '#F9FAFB', text: '#374151' },
  entertainment: { bg: '#FFF7ED', text: '#9A3412' },
};

const CATEGORY_DARK: Record<string, { bg: string; text: string }> = {
  politics:      { bg: '#1E1B4B', text: '#A5B4FC' },
  culture:       { bg: '#2E1065', text: '#C4B5FD' },
  food:          { bg: '#450A0A', text: '#FCA5A5' },
  ethics:        { bg: '#2D1B00', text: '#FCD34D' },
  sports:        { bg: '#052E16', text: '#6EE7B7' },
  tech:          { bg: '#0C1A3B', text: '#93C5FD' },
  relationships: { bg: '#4A0D2E', text: '#F9A8D4' },
  hypothetical:  { bg: '#021716', text: '#5EEAD4' },
  news:          { bg: '#111827', text: '#9CA3AF' },
  entertainment: { bg: '#431407', text: '#FDBA74' },
};

// ── Animated vote bar (10px) ──────────────────────────────────────────────────

function VoteBar({ yesPct, colors }: { yesPct: number; colors: ReturnType<typeof useColors> }) {
  const yesAnim = useRef(new Animated.Value(yesPct)).current;
  const noAnim = useRef(new Animated.Value(100 - yesPct)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(yesAnim, { toValue: yesPct, tension: 180, friction: 22, useNativeDriver: false }),
      Animated.spring(noAnim, { toValue: 100 - yesPct, tension: 180, friction: 22, useNativeDriver: false }),
    ]).start();
  }, [yesPct]);

  return (
    <View style={[barStyles.track, { backgroundColor: colors.surfaceAlt }]}>
      <Animated.View style={[barStyles.fill, { flex: yesAnim, backgroundColor: colors.agree }]} />
      <Animated.View style={[barStyles.fill, { flex: noAnim, backgroundColor: colors.disagree }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { flexDirection: 'row', height: 10, borderRadius: 99, overflow: 'hidden' },
  fill: {},
});

// ── Majority text ─────────────────────────────────────────────────────────────

function getMajorityText(userVote: 1 | -1, yesPct: number): string {
  if (yesPct === 50) return 'Perfectly split — rare.';
  const userAgreed = userVote === 1;
  const majorityAgreed = yesPct > 50;
  if (userAgreed === majorityAgreed) return 'You voted with the majority.';
  return 'You voted with the minority.';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity, gap: 16, paddingHorizontal: 20, paddingTop: 20 }}>
      <View style={[skStyles.line, { width: 80, backgroundColor: colors.surfaceAlt }]} />
      <View style={[skStyles.line, { height: 28, backgroundColor: colors.surfaceAlt }]} />
      <View style={[skStyles.line, { height: 28, width: '70%', backgroundColor: colors.surfaceAlt }]} />
      <View style={[skStyles.bar, { backgroundColor: colors.surfaceAlt }]} />
      <View style={[skStyles.line, { width: 120, backgroundColor: colors.surfaceAlt }]} />
    </Animated.View>
  );
}

const skStyles = StyleSheet.create({
  line: { height: 16, borderRadius: 6 },
  bar: { height: 10, borderRadius: 99 },
});

// ── Poll Detail Screen ────────────────────────────────────────────────────────

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'info'; duration?: number } | null>(null);
  const pollCtx = usePollState();

  const showError = useCallback((msg: string) => setToast({ message: msg, variant: 'error' }), []);
  const showBlocked = useCallback((msg: string) => setToast({ message: msg, variant: 'error', duration: 4000 }), []);

  const { data, loading, error, updateCounts, addOptimisticComment, confirmComment, removeComment } = usePollDetail(id);

  const currentVoteRef = useRef<1 | -1 | null>(null);

  const handleCountsUpdate = useCallback(
    (pollId: string, yes: number, no: number, total: number) => {
      if (pollId === id && currentVoteRef.current !== null) {
        updateCounts(yes, no, total, currentVoteRef.current);
        pollCtx.updatePollCounts(pollId, yes, no, total);
      }
    },
    [id, updateCounts, pollCtx],
  );

  const { getUserVote, vote, initVote } = useVote(handleCountsUpdate, showError);

  // Hydrate vote state from server response
  useEffect(() => {
    if (data?.user_vote != null) {
      initVote(id, data.user_vote as 1 | -1);
    }
  }, [data?.user_vote, id, initVote]);

  const serverVote = data?.user_vote as 1 | -1 | null ?? null;
  const currentVote = getUserVote(id) ?? serverVote;
  currentVoteRef.current = currentVote;

  function handleVote(value: 1 | -1) {
    if (!data) return;
    currentVoteRef.current = value;
    pollCtx.markPollVoted(id, value);
    vote(id, value, data.yes_count, data.no_count, data.total_count);
  }

  const poll = data?.poll;
  const total = data?.total_count ?? 0;
  const yesPct = total > 0 ? (data!.yes_count / total) * 100 : 50;
  const noPct = 100 - yesPct;
  const commentCount = data?.comment_count ?? 0;
  const isVoted = currentVote !== null;

  const catColors = poll
    ? ((isDark ? CATEGORY_DARK : CATEGORY_LIGHT)[poll.category] ??
       (isDark ? CATEGORY_DARK.news : CATEGORY_LIGHT.news))
    : null;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* ── Header bar ── */}
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          {poll && catColors ? (
            <View style={[styles.catBadge, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.catText, { color: catColors.text }]}>
                {poll.category.toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <View style={styles.headerSpacer} />
        </View>

        {loading && !data ? (
          <Skeleton colors={colors} />
        ) : error && !data ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={[styles.errorBack, { color: colors.primary }]}>Go back</Text>
            </TouchableOpacity>
          </View>
        ) : data && poll ? (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Poll question */}
              <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>

              {/* Vote bar — solid gray when 0 votes */}
              {total === 0 ? (
                <View style={[barStyles.track, { backgroundColor: colors.surfaceAlt }]} />
              ) : (
                <VoteBar yesPct={yesPct} colors={colors} />
              )}

              {/* Percentages / zero-state row */}
              {total === 0 ? (
                <Text style={[styles.zeroState, { color: colors.textTertiary }]}>
                  Be the first to vote
                </Text>
              ) : (
                <View style={styles.pctRow}>
                  <Text style={[styles.pctAgree, { color: colors.agree }]}>
                    {Math.round(yesPct)}% agree
                  </Text>
                  <Text style={[styles.totalCount, { color: colors.textTertiary }]}>
                    {formatVoteCount(total)} votes · {formatVoteCount(commentCount)} voices
                  </Text>
                  <Text style={[styles.pctDisagree, { color: colors.disagree }]}>
                    {Math.round(noPct)}% disagree
                  </Text>
                </View>
              )}

              {/* Majority text */}
              {isVoted && total > 0 && (
                <Text style={[styles.majorityText, { color: colors.textSecondary }]}>
                  {getMajorityText(currentVote!, yesPct)}
                </Text>
              )}

              {/* Vote buttons */}
              <VoteButtons
                pollType={poll.poll_type as any}
                optionA={poll.option_a}
                optionB={poll.option_b}
                userVote={currentVote}
                onVote={handleVote}
              />

              {/* View Stats button — only after voting */}
              {isVoted && (
                <TouchableOpacity
                  style={[styles.statsBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => router.push(`/poll/${id}/stats`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
                  <Text style={[styles.statsBtnText, { color: colors.primary }]}>View Stats</Text>
                </TouchableOpacity>
              )}

              {/* "Your voice" — shown above Voices once the user has commented */}
              {data.has_commented && data.user_comment ? (
                <View style={[styles.yourVoiceCard, { borderColor: colors.primary }]}>
                  <Text style={[styles.yourVoiceLabel, { color: colors.textTertiary }]}>
                    Your voice
                  </Text>
                  <Text style={[styles.yourVoiceText, { color: colors.textSecondary }]}>
                    {data.user_comment}
                  </Text>
                </View>
              ) : null}

              {/* Voices (comments) */}
              <CommentSection
                comments={data.comments}
                onError={showError}
              />
              {/* onError kept for future flag/report features */}

              <View style={styles.bottomPad} />
            </ScrollView>

            {/* Comment input pinned at bottom — hidden if comment_banned */}
            {data.comment_banned ? (
              <View style={[styles.bannedContainer, { borderTopColor: colors.border, paddingBottom: Math.max(0, 12) }]}>
                <Text style={[styles.bannedText, { color: colors.textTertiary }]}>
                  Commenting is unavailable on your account.
                </Text>
              </View>
            ) : (
              <CommentInput
                pollId={id}
                hasCommented={data.has_commented}
                onOptimisticComment={addOptimisticComment}
                onConfirmComment={confirmComment}
                onRemoveComment={removeComment}
                onError={showError}
                onBlocked={showBlocked}
              />
            )}
          </>
        ) : null}
      </SafeAreaView>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          visible={!!toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerSpacer: { width: 36 },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  catText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  question: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    lineHeight: 29,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pctAgree: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  pctDisagree: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  totalCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  zeroState: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  majorityText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  statsBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  errorBack: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  bottomPad: { height: 20 },
  yourVoiceCard: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    gap: 3,
  },
  yourVoiceLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  yourVoiceText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  bannedContainer: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    alignItems: 'center',
  },
  bannedText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
});
