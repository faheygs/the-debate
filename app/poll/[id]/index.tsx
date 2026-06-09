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
import { VoteBar } from '@/components/poll/VoteBar';
import { CommentSection } from '@/components/poll/CommentSection';
import { CommentInput } from '@/components/poll/CommentInput';
import { Toast } from '@/components/shared/Toast';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatVoteCount, formatTimeRemaining, generateInsight, pluralize } from '@/lib/utils';
import { voteOnOpinion } from '@/lib/api';
import { usePollDetail } from '@/hooks/usePollDetail';
import { useVote } from '@/hooks/useVote';
import { usePollState } from '@/contexts/PollStateContext';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
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
  bar: { height: 44, borderRadius: 10 },
});

// ── Poll Detail Screen ────────────────────────────────────────────────────────

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'info'; duration?: number } | null>(null);
  const pollCtx = usePollState();

  const showError = useCallback((msg: string) => setToast({ message: msg, variant: 'error' }), []);
  const showBlocked = useCallback((msg: string) => setToast({ message: msg, variant: 'error', duration: 4000 }), []);

  const {
    data,
    loading,
    error,
    updateCounts,
    addOptimisticComment,
    confirmComment,
    removeComment,
    updateOpinionVote,
  } = usePollDetail(id);

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

  const { getUserVote, vote, initVote, isPollClosed } = useVote(handleCountsUpdate, showError);

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

  const handleOpinionVote = useCallback((commentId: string, value: 1 | -1) => {
    console.log('[opinion-vote] starting vote commentId:', commentId, 'value:', value);

    const comment = data?.comments.find(c => c.id === commentId);
    if (!comment) {
      console.log('[opinion-vote] comment not found in data');
      return;
    }

    const prevVote = comment.user_opinion_vote ?? null;
    const prevUp = comment.up_count ?? 0;
    const prevDown = comment.down_count ?? 0;
    console.log('[opinion-vote] prevVote:', prevVote, 'prevUp:', prevUp, 'prevDown:', prevDown);

    let newVote: 1 | -1 | null;
    let newUp = prevUp;
    let newDown = prevDown;

    if (prevVote === value) {
      newVote = null;
      if (value === 1) newUp = Math.max(0, newUp - 1);
      else newDown = Math.max(0, newDown - 1);
    } else {
      newVote = value;
      if (prevVote === 1) newUp = Math.max(0, newUp - 1);
      else if (prevVote === -1) newDown = Math.max(0, newDown - 1);
      if (value === 1) newUp++;
      else newDown++;
    }

    console.log('[opinion-vote] optimistic newVote:', newVote, 'newUp:', newUp, 'newDown:', newDown);
    updateOpinionVote(commentId, newVote, newUp - newDown, newUp, newDown);

    console.log('[opinion-vote] api call starting');
    voteOnOpinion(commentId, value).then((result) => {
      console.log('[opinion-vote] api result:', JSON.stringify(result));
      updateOpinionVote(commentId, result.user_vote, result.net_score, result.up_count, result.down_count);
    }).catch((err: unknown) => {
      console.error('[opinion-vote] CAUGHT ERROR:', err);
      console.error('[opinion-vote] error message:', (err as any)?.message);
      console.error('[opinion-vote] error stack:', (err as any)?.stack);
      updateOpinionVote(commentId, prevVote, prevUp - prevDown, prevUp, prevDown);
      showError('Failed to vote on opinion');
    });
  }, [data?.comments, updateOpinionVote, showError]);

  const poll = data?.poll;
  const total = data?.total_count ?? 0;
  const yesPct = total > 0 ? (data!.yes_count / total) * 100 : 50;
  const commentCount = data?.comment_count ?? 0;
  const isVoted = currentVote !== null;

  const isClosed =
    isPollClosed(id) ||
    (!!poll?.expires_at && new Date(poll.expires_at) < new Date());

  const timeRemaining = poll?.expires_at ? formatTimeRemaining(poll.expires_at) : null;

  const timeColor = (() => {
    if (!poll?.expires_at || isClosed) return colors.textTertiary;
    const msLeft = new Date(poll.expires_at).getTime() - Date.now();
    if (msLeft < 24 * 60 * 60 * 1000) return colors.accent;
    return colors.textTertiary;
  })();

  // ── Vote-to-unlock animations ─────────────────────────────────────────────

  const lockOpacity = useRef(new Animated.Value(1)).current;
  const opinionsOpacity = useRef(new Animated.Value(0)).current;
  const hasVotedRef = useRef(false);

  useEffect(() => {
    if (data?.user_vote != null && !hasVotedRef.current) {
      hasVotedRef.current = true;
      lockOpacity.setValue(0);
      opinionsOpacity.setValue(1);
    }
  }, [data?.user_vote]);

  useEffect(() => {
    if (isVoted && !hasVotedRef.current) {
      hasVotedRef.current = true;
      Animated.timing(lockOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      Animated.timing(opinionsOpacity, { toValue: 1, duration: 300, delay: 200, useNativeDriver: true }).start();
    }
  }, [isVoted]);

  const isDark = colorScheme === 'dark';
  const voiceCardBg = isDark ? '#1E1208' : '#FDF3E7';
  const voiceCardBorderEdge = isDark ? '#3A2510' : '#D4976E';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header bar */}
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          {poll ? (
            <View style={[styles.catBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.catText, { color: colors.textSecondary }]}>
                {poll.category.toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <View style={styles.headerSpacer} />
        </View>

        {/* Time remaining strip */}
        {poll?.expires_at && (isClosed || timeRemaining) && (
          <View style={[styles.timeStrip, { borderBottomColor: colors.border }]}>
            <Ionicons name="time-outline" size={14} color={timeColor} />
            <Text style={[styles.timeText, { color: timeColor }]}>
              {isClosed ? 'Debate closed' : timeRemaining}
            </Text>
          </View>
        )}

        {loading && !data ? (
          <Skeleton colors={colors} />
        ) : error && !data ? (
          <EmptyState
            icon="alert-circle-outline"
            heading="Debate not found"
            subtext="It may have been removed"
            button={{ label: 'Go Back', onPress: () => router.back() }}
          />
        ) : data && poll ? (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>

              <View style={styles.voteBarWrap}>
                <VoteBar agreePct={yesPct} userVote={currentVote} totalVotes={total} />
              </View>

              {/* Lock indicator — fades out on vote */}
              <Animated.View
                style={[styles.lockRow, { opacity: lockOpacity }]}
                pointerEvents={isVoted ? 'none' : 'box-none'}
              >
                <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.lockText, { color: colors.textTertiary }]}>
                  Vote to unlock opinions and stats
                </Text>
              </Animated.View>

              <VoteButtons
                pollType={poll.poll_type as any}
                optionA={poll.option_a}
                optionB={poll.option_b}
                userVote={currentVote}
                onVote={handleVote}
                disabled={isClosed}
              />

              {/* Revealed section — fades in on vote */}
              <Animated.View
                style={[styles.revealedSection, { opacity: opinionsOpacity }]}
                pointerEvents={isVoted ? 'box-none' : 'none'}
              >
                {/* Vote / opinion count */}
                {isVoted && (
                  <Text style={[styles.totalCount, { color: colors.textTertiary }]}>
                    {pluralize(total, 'vote')} · {pluralize(commentCount, 'opinion')}
                  </Text>
                )}

                {/* Contextual insight */}
                {isVoted && total > 0 && (
                  <Text style={[styles.insightText, { color: colors.textTertiary }]}>
                    {generateInsight(yesPct, total, currentVote!)}
                  </Text>
                )}

                {/* Stats pill button */}
                {isVoted && (
                  <TouchableOpacity
                    style={[styles.statsPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    onPress={() => router.push(`/poll/${id}/stats`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="stats-chart-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.statsPillText, { color: colors.textSecondary }]}>View Stats</Text>
                  </TouchableOpacity>
                )}

                {/* Your opinion — pinned above opinions list */}
                {data.has_commented && data.user_comment ? (
                  <View style={[
                    styles.yourVoiceCard,
                    {
                      backgroundColor: voiceCardBg,
                      borderTopColor: voiceCardBorderEdge,
                      borderRightColor: voiceCardBorderEdge,
                      borderBottomColor: voiceCardBorderEdge,
                      borderLeftColor: '#C8762A',
                    },
                  ]}>
                    <View style={styles.yourVoiceLabelRow}>
                      <View style={styles.yourVoiceDot} />
                      <Text style={styles.yourVoiceLabel}>YOUR OPINION</Text>
                    </View>
                    <Text style={[styles.yourVoiceText, { color: colors.text }]}>
                      {data.user_comment}
                    </Text>
                  </View>
                ) : null}

                <CommentSection
                  comments={data.comments}
                  opinionCount={commentCount}
                  onOpinionVote={handleOpinionVote}
                  onError={showError}
                />
              </Animated.View>

              <View style={styles.bottomPad} />
            </ScrollView>

            {data.comment_banned ? (
              <View style={[styles.bannedContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.bannedText, { color: colors.textTertiary }]}>
                  Commenting is unavailable on your account.
                </Text>
              </View>
            ) : isVoted ? (
              <CommentInput
                pollId={id}
                hasCommented={data.has_commented}
                onOptimisticComment={addOptimisticComment}
                onConfirmComment={confirmComment}
                onRemoveComment={removeComment}
                onError={showError}
                onBlocked={showBlocked}
              />
            ) : null}
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
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerSpacer: { width: 36 },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  catText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  timeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  question: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 12,
  },
  voteBarWrap: {
    marginBottom: 12,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  revealedSection: {
    marginTop: 10,
  },
  totalCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  insightText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  statsPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  yourVoiceCard: {
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  yourVoiceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  yourVoiceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8762A',
  },
  yourVoiceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#C8762A',
  },
  yourVoiceText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  bottomPad: { height: 20 },
  bannedContainer: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    alignItems: 'center',
  },
  bannedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
});
