import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import { pluralize } from '@/lib/utils';
import type { PollWithCounts } from '@/types/database';

const AMBER = '#C8762A';
const SLATE = '#2A3440'; // bar disagree side

interface Top10CardProps {
  poll: PollWithCounts;
  rank: number;
}

export function Top10Card({ poll, rank }: Top10CardProps) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';

  const cardBg = isDark ? '#161616' : colors.surface;
  const cardBorder = isDark ? '#252525' : colors.border;

  const isEmpty = poll.total_count === 0;
  const agreePct = !isEmpty
    ? Math.round((poll.yes_count / poll.total_count) * 100)
    : 50;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={() => router.push(`/poll/${poll.id}` as never)}
      activeOpacity={0.85}
    >
      {/* Rank badge */}
      <Text style={[styles.rank, { color: AMBER }]}>
        {rank}
      </Text>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.textTertiary }]}>
          {poll.category.toUpperCase()}
        </Text>

        <Text style={[styles.question, { color: isDark ? '#F5F5F5' : colors.text }]} numberOfLines={3}>
          {poll.question}
        </Text>

        {/* Split bar */}
        {isEmpty ? (
          <View style={[styles.bar, { backgroundColor: isDark ? '#2A2A2A' : colors.border }]} />
        ) : (
          <View style={styles.bar}>
            <View style={[styles.barAgree, { flex: agreePct || 0.01 }]} />
            <View style={[styles.barDisagree, { flex: (100 - agreePct) || 0.01 }]} />
          </View>
        )}

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          {isEmpty ? (
            <Text style={[styles.firstVote, { color: colors.textTertiary }]}>
              Be the first to vote
            </Text>
          ) : (
            <Text style={[styles.voteCount, { color: AMBER }]}>
              {pluralize(poll.total_count, 'vote')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  rank: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 48,
    lineHeight: 48,
    minWidth: 44,
    paddingRight: 12,
  },
  content: {
    flex: 1,
  },
  category: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  question: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  bar: {
    flexDirection: 'row',
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barAgree: {
    backgroundColor: AMBER,
  },
  barDisagree: {
    backgroundColor: SLATE,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  agreePct: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  firstVote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    fontStyle: 'italic',
  },
});
