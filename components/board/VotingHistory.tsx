import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import type { VoteHistoryItem } from '@/types/database';

function voteLabel(item: VoteHistoryItem): string {
  if (item.poll_type === 'versus') {
    return item.value === 1 ? (item.option_a ?? 'Option A') : (item.option_b ?? 'Option B');
  }
  return item.value === 1 ? 'Agreed' : 'Disagreed';
}

function globalResultText(item: VoteHistoryItem): string {
  const total = item.total_count;
  if (total === 0) return 'No votes yet';
  if (item.poll_type === 'versus') {
    const pct = Math.round((item.yes_count / total) * 100);
    return `${pct}% chose ${item.option_a ?? 'Option A'} globally`;
  }
  const pct = Math.round((item.yes_count / total) * 100);
  return `${pct}% agreed globally`;
}

function majorityLabel(item: VoteHistoryItem): 'majority' | 'minority' | null {
  const total = item.total_count;
  if (total === 0) return null;
  const yes_pct = item.yes_count / total;
  const no_pct = item.no_count / total;
  if (item.value === 1) return yes_pct >= 0.5 ? 'majority' : 'minority';
  return no_pct >= 0.5 ? 'majority' : 'minority';
}

function ShimmerItem() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <Animated.View style={[styles.shimmerLine, { width: '90%', backgroundColor: colors.surfaceAlt, opacity }]} />
      <Animated.View style={[styles.shimmerLine, { width: '60%', backgroundColor: colors.surfaceAlt, opacity }]} />
      <Animated.View style={[styles.shimmerBadge, { backgroundColor: colors.surfaceAlt, opacity }]} />
    </View>
  );
}

interface Props {
  history: VoteHistoryItem[];
  loading: boolean;
}

export function VotingHistory({ history, loading }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>Your Votes</Text>

      {loading && [0, 1, 2, 3].map(i => <ShimmerItem key={i} />)}

      {!loading && history.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={36} color={colors.textTertiary} />
          <Text style={[styles.emptyHeading, { color: colors.text }]}>No votes yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Start voting to build your board
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.navigate('/(tabs)/search')}
            activeOpacity={0.85}
          >
            <Text style={[styles.emptyBtnText, { color: colors.accentText }]}>Explore Debates</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && history.map((item, idx) => {
        const voted = item.value === 1;
        const voteText = voteLabel(item);
        const resultText = globalResultText(item);
        const majority = majorityLabel(item);
        const isLast = idx === history.length - 1;

        return (
          <TouchableOpacity
            key={item.poll_id + item.voted_at}
            style={[styles.item, { borderBottomColor: isLast ? 'transparent' : colors.border }]}
            onPress={() => router.push(`/poll/${item.poll_id}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.question, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
              {item.question}
            </Text>

            <View style={styles.voteRow}>
              <Text style={[styles.voteLabel, { color: voted ? colors.accent : colors.textSecondary }]}>
                {voteText}
              </Text>
              {majority && (
                <Text style={[styles.majorityLabel, { color: colors.textTertiary }]}>
                  {' · '}with the {majority}
                </Text>
              )}
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.resultText, { color: colors.textTertiary }]}>
                {resultText}
              </Text>
              <View style={[styles.catBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.catBadgeText, { color: colors.textSecondary }]}>
                  {item.category.toUpperCase()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  heading: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 4,
  },
  item: {
    paddingVertical: 14,
    gap: 5,
    borderBottomWidth: 0.5,
  },
  question: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  voteLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  majorityLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    marginLeft: 8,
  },
  catBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  emptyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  shimmerLine: {
    height: 13,
    borderRadius: 4,
  },
  shimmerBadge: {
    width: 60,
    height: 18,
    borderRadius: 4,
  },
});
