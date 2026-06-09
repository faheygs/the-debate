import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import type { PollWithCounts } from '@/types/database';

const AMBER = '#C8762A';
const SLATE = '#6B8299';

interface ConsensusCardProps {
  poll: PollWithCounts;
  type: 'universal' | 'divided';
}

export function ConsensusCard({ poll, type }: ConsensusCardProps) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';

  const cardBg = isDark ? '#161616' : colors.surface;
  const cardBorder = isDark ? '#252525' : colors.border;

  const agreePct = poll.total_count > 0
    ? Math.round((poll.yes_count / poll.total_count) * 100)
    : 50;

  const bigNumber = type === 'universal'
    ? (agreePct >= 50 ? agreePct : 100 - agreePct)
    : agreePct;

  const label = type === 'universal'
    ? (agreePct >= 50 ? '% AGREE' : '% DISAGREE')
    : `% VS ${100 - agreePct}%`;

  const bigColor = type === 'universal' ? AMBER : SLATE;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={() => router.push(`/poll/${poll.id}` as never)}
      activeOpacity={0.85}
    >
      <Text style={[styles.bigNumber, { color: bigColor }]}>
        {bigNumber}
      </Text>
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.question, { color: isDark ? '#E0E0E0' : colors.text }]} numberOfLines={3}>
        {poll.question}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexShrink: 0,
  },
  bigNumber: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 32,
    letterSpacing: -1,
    lineHeight: 36,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 2,
  },
  question: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
});
