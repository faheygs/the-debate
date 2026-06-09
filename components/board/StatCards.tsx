import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import type { BoardStats } from '@/types/database';

function leanLabel(lean: number | null): string {
  if (lean === null) return '—';
  if (lean <= -1.5) return 'Very Liberal';
  if (lean <= -0.5) return 'Liberal';
  if (lean <= 0.5) return 'Moderate';
  if (lean <= 1.5) return 'Conservative';
  return 'Very Conservative';
}

function capitalize(str: string | null): string {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ShimmerBox() {
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
    <Animated.View style={[styles.shimmerBox, { backgroundColor: colors.surfaceAlt, opacity }]} />
  );
}

function StatBox({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surfaceAlt }]}>
      <Text
        style={[styles.statValue, { color: accent ? colors.accent : colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

interface Props {
  stats: BoardStats | null;
  loading: boolean;
}

export function StatCards({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <View style={styles.grid}>
        <ShimmerBox />
        <ShimmerBox />
        <ShimmerBox />
        <ShimmerBox />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <StatBox value={String(stats.total_votes)} label="Total Votes" />
      <StatBox
        value={stats.total_votes > 0 ? `${stats.contrarian_score}%` : '—'}
        label="Contrarian Score"
        accent={stats.total_votes > 0 && stats.contrarian_score > 50}
      />
      <StatBox value={capitalize(stats.top_category)} label="Top Category" />
      <StatBox value={leanLabel(stats.actual_lean)} label="Your Lean" />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    minHeight: 72,
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  shimmerBox: {
    width: '48%',
    height: 72,
    borderRadius: 10,
  },
});
