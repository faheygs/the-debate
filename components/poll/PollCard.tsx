import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { VoteButtons } from './VoteButtons';
import { useColors } from '@/constants/colors';
import { Spacing } from '@/constants/theme';
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
  const noPct = 100 - yesPct;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/poll/${poll.id}`)}
      activeOpacity={0.95}
    >
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceAlt }]}>
          <ThemedText style={[styles.categoryText, { color: colors.textSecondary }]}>
            {poll.category.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.question, { color: colors.text }]}>
        {poll.question}
      </ThemedText>

      {userVote !== null && (
        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${yesPct}%` as `${number}%`, backgroundColor: colors.agree },
              ]}
            />
            <View
              style={[
                styles.barFillNo,
                { width: `${noPct}%` as `${number}%`, backgroundColor: colors.disagree },
              ]}
            />
          </View>
          <View style={styles.barLabels}>
            <ThemedText style={[styles.barLabel, { color: colors.textTertiary }]}>
              {yesPct}%
            </ThemedText>
            <ThemedText style={[styles.barLabel, { color: colors.textTertiary }]}>
              {noPct}%
            </ThemedText>
          </View>
        </View>
      )}

      <ThemedText style={[styles.voteCount, { color: colors.textTertiary }]}>
        {formatCount(total)} votes
      </ThemedText>

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
    padding: Spacing.three,
    marginBottom: 12,
    gap: Spacing.two,
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
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  barContainer: { gap: 4 },
  barTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  barFillNo: { height: '100%' },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: { fontSize: 11 },
  voteCount: { fontSize: 11 },
});
