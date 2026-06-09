import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import type { DemographicBreakdown as DBreakdown, UserDemographics, DemographicBreakdownGroup } from '@/types/database';

interface Props {
  breakdown: DBreakdown;
  userDemographics: UserDemographics;
  visible: boolean;
}

export function DemographicBreakdown({ breakdown, userDemographics, visible }: Props) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  const rows: { label: string; data: DemographicBreakdownGroup | null }[] = [
    { label: 'Your age group', data: userDemographics.age_group ? (breakdown.age[userDemographics.age_group] ?? null) : null },
    { label: 'Your region', data: userDemographics.region ? (breakdown.region[userDemographics.region] ?? null) : null },
    { label: 'Political lean', data: userDemographics.politics_label ? (breakdown.politics[userDemographics.politics_label] ?? null) : null },
    { label: 'Your gender', data: userDemographics.gender ? (breakdown.gender[userDemographics.gender] ?? null) : null },
  ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>HOW YOUR GROUPS VOTED</Text>
      {rows.map((row) => (
        <BreakdownRow key={row.label} label={row.label} data={row.data} colors={colors} />
      ))}
    </Animated.View>
  );
}

function BreakdownRow({ label, data, colors }: { label: string; data: DemographicBreakdownGroup | null; colors: ReturnType<typeof useColors> }) {
  const MIN_VOTES = 5;
  const hasData = data !== null && data.total >= MIN_VOTES;

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      {hasData ? (
        <View style={styles.rowRight}>
          <View style={[styles.miniTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.miniFill, { flex: data!.yes_pct, backgroundColor: colors.accent }]} />
            <View style={[styles.miniFill, { flex: 100 - data!.yes_pct, backgroundColor: colors.border }]} />
          </View>
          <Text style={[styles.rowPct, { color: colors.accent }]}>
            {data!.yes_pct >= 50 ? data!.yes_pct : 100 - data!.yes_pct}%
          </Text>
        </View>
      ) : (
        <Text style={[styles.noData, { color: colors.textTertiary }]}>Not enough data</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  heading: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1.2,
  },
  miniTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
    flex: 1,
  },
  miniFill: {},
  rowPct: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
  noData: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
});
