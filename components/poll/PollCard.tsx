import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { VoteButtons } from './VoteButtons';
import { useColors } from '@/constants/colors';
import type { Poll } from '@/types/app';

type Props = {
  poll: Poll;
  userVote: 1 | -1 | null;
  yesCount: number;
  noCount: number;
  onVote: (pollId: string, value: 1 | -1) => void;
};

export function PollCard({ poll, userVote, yesCount, noCount, onVote }: Props) {
  const colors = useColors();
  const total = yesCount + noCount;
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 50;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/poll/${poll.id}`)}
      activeOpacity={0.95}
    >
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            {poll.category.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.question, { color: colors.text }]}>
        {poll.question}
      </Text>

      {userVote !== null && total > 0 && (
        <View style={styles.barContainer}>
          <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.barFill, { width: `${yesPct}%` as `${number}%`, backgroundColor: colors.accent }]} />
          </View>
          <View style={styles.barLabels}>
            <Text style={[styles.barLabel, { color: colors.accent }]}>{yesPct}%</Text>
            <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{100 - yesPct}%</Text>
          </View>
        </View>
      )}

      <Text style={[styles.voteCount, { color: colors.textTertiary }]}>
        {formatCount(total)} votes
      </Text>

      <VoteButtons
        pollType={poll.poll_type}
        optionA={poll.option_a}
        optionB={poll.option_b}
        userVote={userVote}
        onVote={v => onVote(poll.id, v)}
      />
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
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
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  categoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  question: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  barContainer: { gap: 4 },
  barTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  voteCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
