import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import type { DbUserInsight } from '@/types/database';

interface Props {
  insights: DbUserInsight | null;
}

export function WorldviewSummary({ insights }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.accent }]}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>YOUR WORLDVIEW</Text>
      {insights?.worldview_summary ? (
        <>
          <Text style={[styles.summary, { color: colors.textSecondary }]}>
            {insights.worldview_summary}
          </Text>
          <Text style={[styles.generated, { color: colors.accent }]}>
            Generated from {insights.vote_count_at_generation ?? 0} vote{(insights.vote_count_at_generation ?? 0) !== 1 ? 's' : ''}
          </Text>
        </>
      ) : (
        <Text style={[styles.placeholder, { color: colors.textTertiary }]}>
          Your worldview analysis will appear here soon.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 0.5,
    borderLeftWidth: 3,
    padding: 14,
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  summary: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  generated: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  placeholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
});
