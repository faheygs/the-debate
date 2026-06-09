import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import { VoteBar } from '@/components/poll/VoteBar';
import { formatVoteCount, formatTimeRemaining } from '@/lib/utils';
import { usePollState } from '@/contexts/PollStateContext';
import type { PollWithCounts } from '@/types/database';

interface Props {
  poll: PollWithCounts;
  userVote: 1 | -1 | null;
  showTimeRemaining?: boolean;
}

export function PollCardCompact({ poll, userVote, showTimeRemaining = false }: Props) {
  const colors = useColors();
  const ctx = usePollState();
  const override = ctx.getPollState(poll.id);

  const total = override?.total_count ?? poll.total_count;
  const yes = override?.yes_count ?? poll.yes_count;
  const effectiveVote = override?.user_vote ?? userVote;
  const voted = effectiveVote !== null;
  const yesPct = total > 0 ? (yes / total) * 100 : 50;

  const timeRemaining = showTimeRemaining ? formatTimeRemaining(poll.expires_at ?? null) : null;

  const timeColor = (() => {
    if (!timeRemaining || !poll.expires_at) return colors.textTertiary;
    const msLeft = new Date(poll.expires_at).getTime() - Date.now();
    if (msLeft < 24 * 60 * 60 * 1000) return colors.accent;
    return colors.textTertiary;
  })();

  const borderColor = voted ? colors.accent : colors.border;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor, borderLeftColor: borderColor }]}
      onPress={() => router.push(`/poll/${poll.id}`)}
      activeOpacity={0.85}
    >
      <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.badgeText, { color: colors.textSecondary }]} numberOfLines={1}>
          {poll.category.toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.text }]} numberOfLines={3} ellipsizeMode="tail">
        {poll.question}
      </Text>

      <View style={{ flex: 1 }} />

      <VoteBar agreePct={yesPct} userVote={effectiveVote} totalVotes={total} height={24} />

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={[styles.count, { color: colors.textTertiary }]}>
            {total === 0 ? 'No votes yet' : `${formatVoteCount(total)} votes`}
          </Text>
          {timeRemaining && (
            <Text style={[styles.timeRemaining, { color: timeColor }]}>{timeRemaining}</Text>
          )}
        </View>
        {voted && (
          <Text style={[styles.voted, { color: colors.accent }]}>
            {effectiveVote === 1 ? 'Agreed' : 'Disagreed'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 160,
    borderRadius: 12,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    padding: 12,
    marginRight: 10,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  question: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerLeft: {
    gap: 1,
  },
  count: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  timeRemaining: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  voted: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
});
