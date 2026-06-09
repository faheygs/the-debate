import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useGlobalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { formatVoteCount, formatTimeRemaining, formatGroupLabel } from '@/lib/utils';
import { VoteBar } from '@/components/poll/VoteBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePollDetail } from '@/hooks/usePollDetail';
import type { DemographicGroup } from '@/types/database';

type DimKey = 'age' | 'politics' | 'region' | 'gender';

const TABS: { key: DimKey; label: string }[] = [
  { key: 'age', label: 'Age' },
  { key: 'politics', label: 'Politics' },
  { key: 'region', label: 'Region' },
  { key: 'gender', label: 'Gender' },
];

const AMBER = '#C8762A';
const SLATE = '#6B8299';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ opacity, gap: 16, paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, height: 100, borderRadius: 14, backgroundColor: colors.surfaceAlt }} />
        <View style={{ flex: 1, height: 100, borderRadius: 14, backgroundColor: colors.surfaceAlt }} />
      </View>
      <View style={{ height: 128, borderRadius: 14, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 40, borderRadius: 99, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 70, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 70, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
      <View style={{ height: 70, borderRadius: 8, backgroundColor: colors.surfaceAlt }} />
    </Animated.View>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────────

function GroupRow({
  group,
  dim,
  isOwn,
  userVote,
  isDark,
  totalVotes,
  colors,
}: {
  group: DemographicGroup;
  dim: DimKey;
  isOwn: boolean;
  userVote: 1 | -1 | null;
  isDark: boolean;
  totalVotes: number;
  colors: ReturnType<typeof useColors>;
}) {
  const displayLabel = formatGroupLabel(dim, group.label);
  const dividerColor = isDark ? '#1E1E1E' : colors.border;

  const groupPct = totalVotes > 0 ? Math.round((group.total / totalVotes) * 100) : 0;

  return (
    <View style={[groupStyles.row, { borderBottomColor: dividerColor }]}>
      <View style={groupStyles.labelRow}>
        <View style={groupStyles.labelLeft}>
          {isOwn && <View style={groupStyles.ownDot} />}
          <Text
            style={[groupStyles.label, { color: isOwn ? AMBER : colors.text }]}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
        </View>
        <Text style={[groupStyles.groupPct, { color: colors.textTertiary }]}>
          {groupPct}% of votes
        </Text>
      </View>

      <VoteBar
        agreePct={group.yes_pct}
        userVote={userVote ?? 1}
        totalVotes={group.total}
        height={28}
      />
      {group.yes === 0 || group.no === 0 ? (
        <Text style={[groupStyles.countText, { color: colors.textTertiary }]}>
          {group.yes > 0 ? group.yes : group.no} of {totalVotes}
        </Text>
      ) : (
        <View style={groupStyles.countRow}>
          <Text style={[groupStyles.countText, { color: colors.textTertiary }]}>
            {group.yes} of {totalVotes}
          </Text>
          <Text style={[groupStyles.countText, { color: colors.textTertiary }]}>
            {group.no} of {totalVotes}
          </Text>
        </View>
      )}
    </View>
  );
}

const groupStyles = StyleSheet.create({
  row: {
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  ownDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: AMBER,
    flexShrink: 0,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    flexShrink: 1,
  },
  groupPct: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flexShrink: 0,
    marginLeft: 8,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});

// ── Stats Screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<DimKey>('age');

  const { data, loading, error } = usePollDetail(id);

  const poll = data?.poll;
  const total = data?.total_count ?? 0;
  const commentCount = data?.comment_count ?? 0;
  const userVote = (data?.user_vote as 1 | -1 | null) ?? null;
  const yesPct = total > 0 ? Math.round((data!.yes_count / total) * 100) : 50;

  const full = data?.full_breakdown;
  const userDemo = data?.user_demographics;

  const cardBg = isDark ? '#161616' : colors.surface;
  const cardBorder = isDark ? '#252525' : colors.border;
  const tabInactiveBg = isDark ? '#1E1E1E' : colors.surfaceAlt;
  const tabInactiveBorder = isDark ? '#2A2A2A' : colors.borderMid;

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

  const isClosed = !!poll?.expires_at && new Date(poll.expires_at) < new Date();
  const timeRemaining = poll?.expires_at ? formatTimeRemaining(poll.expires_at) : null;

  const timeColor = (() => {
    if (!poll?.expires_at || isClosed) return colors.textTertiary;
    const msLeft = new Date(poll.expires_at).getTime() - Date.now();
    if (msLeft < 24 * 60 * 60 * 1000) return colors.accent;
    return colors.textTertiary;
  })();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: isDark ? '#0A0A0A' : colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Stats</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Poll question subtitle */}
      {poll && (
        <Text
          style={[styles.subtitle, { color: colors.textTertiary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {poll.question}
        </Text>
      )}

      {/* Time strip */}
      {poll?.expires_at && (isClosed || timeRemaining) && (
        <View style={[styles.timeStrip, { borderBottomColor: colors.border }]}>
          <Ionicons name="time-outline" size={14} color={timeColor} />
          <Text style={[styles.timeText, { color: timeColor }]}>
            {isClosed ? 'Debate closed' : timeRemaining}
          </Text>
        </View>
      )}

      {loading && !data ? (
        <Skeleton colors={colors} />
      ) : error && !data ? (
        <EmptyState
          icon="alert-circle-outline"
          heading="Debate not found"
          subtext="It may have been removed"
          button={{ label: 'Go Back', onPress: () => router.back() }}
        />
      ) : data ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary cards */}
          <View style={styles.summarySection}>
            {/* Top row: votes + opinions */}
            <View style={styles.topCardRow}>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder, borderBottomColor: 'rgba(200, 118, 42, 0.4)', borderBottomWidth: 2 }]}>
                <Ionicons name="bar-chart-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {formatVoteCount(total)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>votes</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder, borderBottomColor: 'rgba(107, 130, 153, 0.4)', borderBottomWidth: 2 }]}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {formatVoteCount(commentCount)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>opinions</Text>
              </View>
            </View>

            {/* Split card */}
            <View style={[styles.splitCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.splitLabelRow}>
                <Text style={[styles.splitLabel, { color: AMBER }]}>Agree</Text>
                <Text style={[styles.splitLabel, { color: SLATE }]}>Disagree</Text>
              </View>

              <VoteBar
                agreePct={yesPct}
                userVote={userVote ?? 1}
                totalVotes={total}
                height={36}
              />
            </View>
          </View>

          {/* Tab pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
            style={styles.tabScroll}
          >
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabPill,
                    active
                      ? [styles.tabPillActive, { shadowColor: AMBER, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }]
                      : { backgroundColor: tabInactiveBg, borderColor: tabInactiveBorder },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, { color: active ? '#FFF8F0' : colors.textTertiary }, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Demographic rows */}
          {groups.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No data yet
              </Text>
            </View>
          ) : (
            <View>
              {groups.map(group => (
                <GroupRow
                  key={group.label}
                  group={group}
                  dim={activeTab}
                  isOwn={isOwnGroup(activeTab, group.label)}
                  userVote={userVote}
                  isDark={isDark}
                  totalVotes={total}
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 20,
  },
  timeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summarySection: {
    gap: 8,
    marginBottom: 24,
  },
  topCardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
    gap: 6,
  },
  statNumber: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  splitCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  splitLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  tabScroll: {
    marginBottom: 24,
  },
  tabRow: {
    gap: 8,
    paddingHorizontal: 0,
  },
  tabPill: {
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tabPillActive: {
    backgroundColor: AMBER,
    borderColor: AMBER,
  },
  tabText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  tabTextActive: {
    fontFamily: 'Inter_600SemiBold',
  },
  emptyTab: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
});
