import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import { pluralize } from '@/lib/utils';
import type { PollWithCounts } from '@/types/database';

const AMBER = '#C8762A';

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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={() => router.push(`/poll/${poll.id}` as never)}
      activeOpacity={0.85}
    >
      <Text style={[styles.rank, { color: AMBER }]}>{rank}</Text>

      <View style={styles.content}>
        <Text style={[styles.category, { color: colors.textTertiary }]}>
          {poll.category.toUpperCase()}
        </Text>

        <Text style={[styles.question, { color: isDark ? '#F5F5F5' : colors.text }]} numberOfLines={3}>
          {poll.question}
        </Text>

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
