import { useEffect, useRef, memo } from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { VoteButtons } from '@/components/poll/VoteButtons';
import { VoteBar } from '@/components/poll/VoteBar';
import { formatVoteCount } from '@/components/shared/VoteCount';
import { usePollState } from '@/contexts/PollStateContext';
import type { PollWithCounts } from '@/types/database';

// ── Status label ──────────────────────────────────────────────────────────────

type StatusInfo = {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  isHot: boolean;
};

function getStatus(poll: PollWithCounts, velocity?: number): StatusInfo | null {
  if (velocity && velocity > 500) return { label: 'Trending', iconName: 'flame-outline', isHot: true };
  if (velocity && velocity > 100) return { label: 'Hot', iconName: 'flash-outline', isHot: true };
  if (poll.expires_at) {
    const msLeft = new Date(poll.expires_at).getTime() - Date.now();
    if (msLeft < 2 * 60 * 60 * 1000) return { label: 'Closing', iconName: 'time-outline', isHot: false };
  }
  if (poll.promoted_at) {
    const ageHours = (Date.now() - new Date(poll.promoted_at).getTime()) / (60 * 60 * 1000);
    if (ageHours < 6) return { label: 'Fresh', iconName: 'sparkles-outline', isHot: false };
  }
  return null;
}

function getMajorityLabel(userVote: 1 | -1, yesPct: number): string {
  if (yesPct === 50) return '';
  const userAgreed = userVote === 1;
  const majorityAgreed = yesPct > 50;
  return userAgreed === majorityAgreed ? 'you voted with the majority' : 'you voted with the minority';
}

// ── PollCard ──────────────────────────────────────────────────────────────────

const UPVOTE_THRESHOLD = 10;

interface Props {
  poll: PollWithCounts;
  index: number;
  userVote: 1 | -1 | null;
  onVote: (pollId: string, value: 1 | -1) => void;
  onUpvote?: (pollId: string) => void;
  onTagPress?: (tag: string) => void;
}

export const PollCard = memo(function PollCard({ poll, index, userVote, onVote, onUpvote, onTagPress }: Props) {
  const colors = useColors();
  const ctx = usePollState();
  const override = ctx.getPollState(poll.id);

  const total = override?.total_count ?? poll.total_count;
  const yes = override?.yes_count ?? poll.yes_count;
  const effectiveVote = override?.user_vote ?? userVote;
  const voted = effectiveVote !== null;

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(enterOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(enterTranslate, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const yesPct = total > 0 ? (yes / total) * 100 : 50;
  const commentCount = poll.comment_count ?? 0;
  const status = getStatus(poll, poll.velocity);

  const metaText = (() => {
    if (!voted) {
      if (total === 0) return 'Be the first to vote';
      return `${formatVoteCount(total)} votes · ${formatVoteCount(commentCount)} opinions`;
    }
    const majority = getMajorityLabel(effectiveVote!, yesPct);
    const base = `${formatVoteCount(total)} votes · ${formatVoteCount(commentCount)} opinions`;
    return majority ? `${base} · ${majority}` : base;
  })();

  // ── Pending card ──────────────────────────────────────────────────────────

  if (poll.status === 'pending') {
    const upvoteCount = poll.upvote_count ?? 0;
    const neededMore = Math.max(0, UPVOTE_THRESHOLD - upvoteCount);
    const userUpvoted = poll.user_upvoted ?? false;

    return (
      <Animated.View style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {poll.category.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={10} color={colors.textTertiary} />
              <Text style={[styles.badgeText, { color: colors.textTertiary }]}>In Review</Text>
            </View>
          </View>

          <Text style={[styles.question, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
            {poll.question}
          </Text>

          <View style={[styles.pendingBar, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={{
                height: 5,
                borderRadius: 99,
                width: `${Math.min((upvoteCount / UPVOTE_THRESHOLD) * 100, 100)}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>

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
                  backgroundColor: userUpvoted ? colors.accent : colors.surface,
                  borderColor: userUpvoted ? colors.accent : colors.border,
                },
              ]}
              onPress={() => !userUpvoted && onUpvote?.(poll.id)}
              disabled={userUpvoted}
              activeOpacity={0.75}
            >
              <Ionicons
                name={userUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
                size={14}
                color={userUpvoted ? colors.accentText : colors.textSecondary}
              />
              <Text style={[styles.upvoteBtnText, { color: userUpvoted ? colors.accentText : colors.textSecondary }]}>
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
    <Animated.View style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => router.push(`/poll/${poll.id}`)}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {poll.category.toUpperCase()}
              </Text>
            </View>
            {status && (
              <View style={[styles.badge, styles.badgeRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons
                  name={status.iconName}
                  size={10}
                  color={status.isHot ? colors.accent : colors.textTertiary}
                />
                <Text style={[styles.badgeText, { color: status.isHot ? colors.accent : colors.textTertiary }]}>
                  {status.label}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.question, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
            {poll.question}
          </Text>

          <VoteBar agreePct={yesPct} userVote={effectiveVote} totalVotes={total} />

          <View style={styles.metaRow}>
            <Text style={[styles.infoText, { color: colors.textTertiary, flex: 1 }]} numberOfLines={1}>
              {metaText}
            </Text>
            <Ionicons name="chevron-forward-outline" size={14} color={colors.textTertiary} />
          </View>

          {poll.tags && poll.tags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagRow}
            >
              {poll.tags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  onPress={(e) => { e.stopPropagation(); onTagPress?.(tag); }}
                  activeOpacity={0.7}
                  style={[styles.tagPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Text style={[styles.tagText, { color: colors.textTertiary }]}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

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
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
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
    borderRadius: 6,
    borderWidth: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  question: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  pendingBar: {
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
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
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagPill: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});
