import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { useGlobalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { formatVoteCount } from '@/components/shared/VoteCount';
import { usePollDetail } from '@/hooks/usePollDetail';
import type { DemographicGroup } from '@/types/database';

type DimKey = 'age' | 'politics' | 'region' | 'gender';

const TABS: { key: DimKey; label: string }[] = [
  { key: 'age', label: 'Age' },
  { key: 'politics', label: 'Politics' },
  { key: 'region', label: 'Region' },
  { key: 'gender', label: 'Gender' },
];


// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity, gap: 16, paddingHorizontal: 20, paddingTop: 20 }}>
      <View style={{ height: 80, borderRadius: 12, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 40, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 60, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 60, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 60, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
    </Animated.View>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────────

interface GroupRowProps {
  group: DemographicGroup;
  isOwn: boolean;
  colors: ReturnType<typeof useColors>;
}

function GroupRow({ group, isOwn, colors }: GroupRowProps) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(barWidth, {
      toValue: group.yes_pct,
      tension: 160,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [group.yes_pct]);

  return (
    <View
      style={[
        groupStyles.row,
        isOwn && { borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 10 },
      ]}
    >
      <View style={groupStyles.labelRow}>
        <Text
          style={[
            groupStyles.label,
            { color: isOwn ? colors.primary : colors.text },
          ]}
          numberOfLines={1}
        >
          {group.label}
        </Text>
        <Text style={[groupStyles.agree, { color: colors.agree }]}>
          {group.yes_pct}% agree
        </Text>
      </View>

      {/* Mini vote bar */}
      <View style={[groupStyles.track, { backgroundColor: colors.surfaceAlt }]}>
        <Animated.View
          style={[
            groupStyles.fill,
            {
              backgroundColor: colors.agree,
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <Text style={[groupStyles.count, { color: colors.textTertiary }]}>
        {formatVoteCount(group.total)} votes
      </Text>
    </View>
  );
}

const groupStyles = StyleSheet.create({
  row: {
    gap: 5,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    flex: 1,
  },
  agree: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  track: {
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 99,
  },
  count: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
});

// ── Summary card ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  valueColor?: string;
  colors: ReturnType<typeof useColors>;
}

function SummaryCard({ label, value, valueColor, colors }: SummaryCardProps) {
  return (
    <View style={[summaryStyles.card, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[summaryStyles.value, { color: valueColor ?? colors.text }]}>{value}</Text>
      <Text style={[summaryStyles.label, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
  },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    textAlign: 'center',
  },
});

// ── Stats Screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<DimKey>('age');

  const { data, loading, error } = usePollDetail(id);

  const poll = data?.poll;
  const total = data?.total_count ?? 0;
  const commentCount = data?.comment_count ?? 0;
  const yesPct = total > 0 ? Math.round((data.yes_count / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;

  const full = data?.full_breakdown;
  const userDemo = data?.user_demographics;

  function isOwnGroup(dim: DimKey, label: string): boolean {
    if (!userDemo) return false;
    switch (dim) {
      case 'age': return userDemo.age_group === label;
      case 'region': return userDemo.region === label;
      case 'politics': return userDemo.politics_label === label;
      case 'gender': return userDemo.gender === label;
    }
  }

  const groups: DemographicGroup[] = full ? (full[activeTab] as DemographicGroup[]) : [];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Stats</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Question subtitle */}
      {poll && (
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {poll.question}
        </Text>
      )}

      {loading && !data ? (
        <Skeleton colors={colors} />
      ) : error && !data ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.errorBack, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 2×2 summary grid */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <SummaryCard label="Total votes" value={formatVoteCount(total)} colors={colors} />
              <SummaryCard label="Total voices" value={formatVoteCount(commentCount)} colors={colors} />
            </View>
            <View style={styles.summaryRow}>
              <SummaryCard label="Agree" value={`${yesPct}%`} valueColor={colors.agree} colors={colors} />
              <SummaryCard label="Disagree" value={`${noPct}%`} valueColor={colors.disagree} colors={colors} />
            </View>
          </View>

          {/* Demographic tabs */}
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Group rows */}
          {groups.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textTertiary }]}>
              Not enough data yet
            </Text>
          ) : (
            <View style={styles.groupList}>
              {groups.map(group => (
                <GroupRow
                  key={group.label}
                  group={group}
                  isOwn={isOwnGroup(activeTab, group.label)}
                  colors={colors}
                />
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 17,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  summaryGrid: { gap: 8 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  groupList: { gap: 2 },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  errorBack: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
});
