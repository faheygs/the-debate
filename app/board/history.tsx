import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePersonalBoard } from '@/hooks/usePersonalBoard';
import { VoteBar } from '@/components/poll/VoteBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatVoteCount } from '@/lib/utils';
import type { VoteHistoryItem } from '@/types/database';

const AMBER = '#C8762A';

const CATEGORY_BARS = [
  { key: 'all',           short: 'All' },
  { key: 'politics',      short: 'Pol' },
  { key: 'culture',       short: 'Cult' },
  { key: 'food',          short: 'Food' },
  { key: 'ethics',        short: 'Eth' },
  { key: 'sports',        short: 'Sport' },
  { key: 'tech',          short: 'Tech' },
  { key: 'relationships', short: 'Rel' },
  { key: 'hypothetical',  short: 'Hyp' },
  { key: 'other',         short: 'Other' },
];

const BAR_MAX_H = 44;
const BAR_MIN_H = 3;
const BAR_W = 28;

const MAIN_CATEGORIES = new Set(['politics', 'culture', 'food', 'ethics', 'sports', 'tech', 'relationships', 'hypothetical']);

function isOther(category: string): boolean {
  return !MAIN_CATEGORIES.has(category);
}

function getVoteLabel(item: VoteHistoryItem): { text: string; isAmber: boolean } {
  if (item.poll_type === 'versus') {
    const label = item.value === 1 ? (item.option_a ?? 'Option A') : (item.option_b ?? 'Option B');
    return { text: label, isAmber: true };
  }
  if (item.value === 1) return { text: 'Agreed', isAmber: true };
  return { text: 'Disagreed', isAmber: false };
}

function getMajorityLabel(item: VoteHistoryItem): string | null {
  if (item.total_count === 0) return null;
  const withMajority =
    (item.yes_count > item.no_count && item.value === 1) ||
    (item.no_count > item.yes_count && item.value === -1);
  return withMajority ? 'majority' : 'minority';
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface HistoryItemProps {
  item: VoteHistoryItem;
  onPress: () => void;
}
function HistoryItemRow({ item, onPress }: HistoryItemProps) {
  const agreePct = item.total_count > 0 ? (item.yes_count / item.total_count) * 100 : 50;
  const voteLabel = getVoteLabel(item);
  const majorityLabel = getMajorityLabel(item);

  return (
    <TouchableOpacity style={styles.histItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.histQuestion} numberOfLines={2}>{item.question}</Text>
      <View style={styles.histBar}>
        <VoteBar
          agreePct={agreePct}
          userVote={item.value as 1 | -1}
          totalVotes={item.total_count}
          height={20}
        />
      </View>
      <View style={styles.histFooter}>
        <View style={styles.histFooterLeft}>
          <Text style={[styles.histVoteLabel, { color: voteLabel.isAmber ? AMBER : '#888' }]}>
            {voteLabel.text}
          </Text>
          {majorityLabel ? (
            <Text style={styles.histMajority}> · {majorityLabel}</Text>
          ) : null}
        </View>
        <View style={styles.histFooterRight}>
          <Text style={styles.histVoteCount}>{formatVoteCount(item.total_count)} votes</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{capitalizeFirst(item.category)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { data, loading } = usePersonalBoard();
  const [filter, setFilter] = useState('all');

  const voteHistory = data?.vote_history ?? [];
  const totalVotes = data?.stats?.total_votes ?? 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of voteHistory) {
      const key = MAIN_CATEGORIES.has(v.category) ? v.category : 'other';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [voteHistory]);

  const filtered = useMemo(() => {
    if (filter === 'all') return voteHistory;
    if (filter === 'other') return voteHistory.filter(v => isOther(v.category));
    return voteHistory.filter(v => v.category === filter);
  }, [voteHistory, filter]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={22} color="#888" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Voting History</Text>
            {totalVotes > 0 ? (
              <Text style={styles.headerSub}>{totalVotes} debates</Text>
            ) : null}
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Category bar chart — fixed, never scrolls with the list */}
        <View style={styles.barsStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barsContent}
          >
            {CATEGORY_BARS.map(({ key, short }) => {
              const active = filter === key;
              const count = key === 'all' ? totalVotes : (categoryCounts[key] ?? 0);
              const pct = key === 'all'
                ? (totalVotes > 0 ? 100 : 0)
                : (totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0);
              const barH = key === 'all'
                ? BAR_MAX_H
                : count > 0
                ? Math.max(BAR_MIN_H, Math.round((pct / 100) * BAR_MAX_H))
                : BAR_MIN_H;
              const hasData = key === 'all' || count > 0;
              const barColor = active ? AMBER : hasData ? '#2A2A2A' : '#1C1C1C';
              const labelColor = active ? AMBER : hasData ? '#555' : '#333';
              const pctColor = active ? AMBER : hasData ? '#444' : '#2A2A2A';

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.barCol}
                  onPress={() => setFilter(key)}
                  activeOpacity={0.65}
                >
                  <Text style={[styles.barPct, { color: pctColor }]}>
                    {totalVotes > 0 ? `${pct}%` : ''}
                  </Text>
                  <View style={styles.barArea}>
                    <View style={[styles.bar, { height: barH, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: labelColor }]}>{short}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        {loading && !data ? (
          <View style={styles.loadingBox}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeleton} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState
              icon="checkmark-circle-outline"
              heading={filter === 'all' ? "No votes yet" : `No ${capitalizeFirst(filter)} votes`}
              subtext={filter === 'all' ? "Start voting to build your history" : "Try a different filter"}
              button={filter === 'all' ? { label: 'Explore Debates', onPress: () => router.push('/(tabs)') } : undefined}
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.poll_id}
            renderItem={({ item }) => (
              <HistoryItemRow
                item={item}
                onPress={() => router.push(`/poll/${item.poll_id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F5F5F5',
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#555',
    marginTop: 1,
  },

  // Category bar chart — fixed strip
  barsStrip: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  barsContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCol: {
    width: 44,
    alignItems: 'center',
    marginRight: 4,
  },
  barPct: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  barArea: {
    height: BAR_MAX_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: BAR_W,
    borderRadius: 4,
  },
  barLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    marginTop: 5,
    letterSpacing: 0.2,
  },

  loadingBox: { padding: 16, gap: 8 },
  skeleton: {
    height: 88,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  emptyBox: { flex: 1 },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  separator: {
    height: 8,
  },

  // History item
  histItem: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 12,
    paddingHorizontal: 14,
  },
  histQuestion: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F5F5F5',
    lineHeight: 20,
    marginBottom: 8,
  },
  histBar: {
    marginBottom: 8,
  },
  histFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  histFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  histVoteLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  histMajority: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#555',
  },
  histFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  histVoteCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#555',
  },
  categoryBadge: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#666',
  },
});
