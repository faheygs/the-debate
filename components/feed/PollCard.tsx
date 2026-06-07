import { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { VoteButtons } from '@/components/poll/VoteButtons';
import { formatVoteCount } from '@/components/shared/VoteCount';
import { usePollState } from '@/contexts/PollStateContext';
import type { PollWithCounts } from '@/types/database';

// ── Category badge colors ────────────────────────────────────────────────────

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

// ── Status badge ─────────────────────────────────────────────────────────────

type StatusBadge = {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
  textColor: string;
};

function getStatusBadge(poll: PollWithCounts, velocity?: number): StatusBadge | null {
  if (velocity && velocity > 500) {
    return { label: 'Trending', iconName: 'flame-outline', bg: '#FEF3C7', textColor: '#92400E' };
  }
  if (velocity && velocity > 100) {
    return { label: 'Hot', iconName: 'flash-outline', bg: '#FEF3C7', textColor: '#92400E' };
  }
  if (poll.expires_at) {
    const msLeft = new Date(poll.expires_at).getTime() - Date.now();
    if (msLeft < 2 * 60 * 60 * 1000) {
      return { label: 'Closing', iconName: 'time-outline', bg: '#FFF1F2', textColor: '#E11D48' };
    }
  }
  if (poll.promoted_at) {
    const ageHours = (Date.now() - new Date(poll.promoted_at).getTime()) / (60 * 60 * 1000);
    if (ageHours < 6) {
      return { label: 'Fresh', iconName: 'sparkles-outline', bg: '#EEF2FF', textColor: '#4338CA' };
    }
  }
  return null;
}

// ── Animated vote bar ─────────────────────────────────────────────────────────

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
  track: { flexDirection: 'row', height: 6, borderRadius: 99, overflow: 'hidden' },
  fill: {},
});

// ── PollCard ──────────────────────────────────────────────────────────────────

const UPVOTE_THRESHOLD = 10;

interface Props {
  poll: PollWithCounts;
  index: number;
  userVote: 1 | -1 | null;
  onVote: (pollId: string, value: 1 | -1) => void;
  onUpvote?: (pollId: string) => void;
}

export function PollCard({ poll, index, userVote, onVote, onUpvote }: Props) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const ctx = usePollState();
  const override = ctx.getPollState(poll.id);

  const total = override?.total_count ?? poll.total_count;
  const yes = override?.yes_count ?? poll.yes_count;
  const effectiveVote = override?.user_vote ?? userVote;

  // Enter animation — staggered fade + 4px slide up
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(enterOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(enterTranslate, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, delay);
  }, []);

  const yesPct = total > 0 ? (yes / total) * 100 : 50;
  const commentCount = poll.comment_count ?? 0;
  const isPending = poll.status === 'pending';

  const catColors = (isDark ? CATEGORY_DARK : CATEGORY_LIGHT)[poll.category] ??
    (isDark ? CATEGORY_DARK.news : CATEGORY_LIGHT.news);

  const statusBadge = getStatusBadge(poll, poll.velocity);

  // ── Pending (review) card ─────────────────────────────────────────────────

  if (isPending) {
    const upvoteCount = poll.upvote_count ?? 0;
    const neededMore = Math.max(0, UPVOTE_THRESHOLD - upvoteCount);
    const userUpvoted = poll.user_upvoted ?? false;

    return (
      <Animated.View style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.badgeText, { color: catColors.text }]}>
                {poll.category.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeRow, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={10} color="#92400E" />
              <Text style={[styles.badgeText, { color: '#92400E' }]}>In Review</Text>
            </View>
          </View>

          {/* Question */}
          <Text style={[styles.question, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
            {poll.question}
          </Text>

          {/* Upvote progress bar */}
          <View style={[barStyles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                barStyles.fill,
                {
                  flex: Math.max(upvoteCount, 0),
                  backgroundColor: colors.primary,
                },
              ]}
            />
            <View style={{ flex: Math.max(UPVOTE_THRESHOLD - upvoteCount, 0) }} />
          </View>

          {/* Upvote info row + button */}
          <View style={styles.pendingRow}>
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              {neededMore > 0
                ? `${neededMore} more ${neededMore === 1 ? 'upvote' : 'upvotes'} to go live`
                : 'Ready to go live!'}
            </Text>
            <TouchableOpacity
              style={[
                styles.upvoteBtn,
                {
                  backgroundColor: userUpvoted ? colors.primary : colors.surface,
                  borderColor: userUpvoted ? colors.primary : colors.border,
                },
              ]}
              onPress={() => !userUpvoted && onUpvote?.(poll.id)}
              disabled={userUpvoted}
              activeOpacity={0.75}
            >
              <Ionicons
                name={userUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
                size={14}
                color={userUpvoted ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.upvoteBtnText, { color: userUpvoted ? '#fff' : colors.textSecondary }]}>
                {upvoteCount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ── Live card ─────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push(`/poll/${poll.id}`)}
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Header row — category badge left, status badge right */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.badgeText, { color: catColors.text }]}>
                {poll.category.toUpperCase()}
              </Text>
            </View>
            {statusBadge && (
              <View style={[styles.badge, styles.badgeRow, { backgroundColor: statusBadge.bg }]}>
                <Ionicons name={statusBadge.iconName} size={10} color={statusBadge.textColor} />
                <Text style={[styles.badgeText, { color: statusBadge.textColor }]}>
                  {statusBadge.label}
                </Text>
              </View>
            )}
          </View>

          {/* Poll question */}
          <Text
            style={[styles.question, { color: colors.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {poll.question}
          </Text>

          {/* Vote bar — solid gray when 0 votes */}
          {total === 0 ? (
            <View style={[barStyles.track, { backgroundColor: colors.surfaceAlt }]} />
          ) : (
            <VoteBar yesPct={yesPct} colors={colors} />
          )}

          {/* Info row — "votes · voices" or zero-state prompt */}
          {total === 0 ? (
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              Be the first to vote
            </Text>
          ) : (
            <View style={styles.infoRow}>
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                {formatVoteCount(total)} votes
              </Text>
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>{' · '}</Text>
              <Ionicons name="chatbubble-outline" size={11} color={colors.textTertiary} />
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                {' '}{formatVoteCount(commentCount)} voices
              </Text>
            </View>
          )}

          {/* Vote buttons */}
          <VoteButtons
            pollType={poll.poll_type as any}
            optionA={poll.option_a}
            optionB={poll.option_b}
            userVote={effectiveVote}
            onVote={v => onVote(poll.id, v)}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  question: {
    fontFamily: 'Syne_700Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  upvoteBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
});
