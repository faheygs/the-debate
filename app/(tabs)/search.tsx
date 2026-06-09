import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import { CATEGORIES } from '@/constants/categories';
import { useExplore } from '@/hooks/useExplore';
import { useSearch } from '@/hooks/useSearch';
import { PollCard } from '@/components/feed/PollCard';
import { PollCardSkeleton } from '@/components/feed/PollCardSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Top10Card } from '@/components/explore/Top10Card';
import { BlowingUpRow } from '@/components/explore/BlowingUpRow';
import { ConsensusCard } from '@/components/explore/ConsensusCard';
import { usePollState } from '@/contexts/PollStateContext';
import { useVote } from '@/hooks/useVote';
import type { CategoryCount, PollWithCounts } from '@/types/database';

type ScreenMode = 'explore' | 'search' | 'category';

// Per-category accent colors for the topic grid corner triangles
const CATEGORY_ACCENTS: Record<string, string> = {
  politics:      '#6366F1',
  culture:       '#8B5CF6',
  food:          '#EF4444',
  ethics:        '#F59E0B',
  sports:        '#10B981',
  tech:          '#3B82F6',
  relationships: '#EC4899',
  hypothetical:  '#14B8A6',
  news:          '#6B7280',
  entertainment: '#F97316',
  other:         '#8B5CF6',
};

export default function ExploreScreen() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';

  const explore = useExplore();
  const search = useSearch();
  const ctx = usePollState();
  const { vote, getUserVote } = useVote(ctx.updatePollCounts, () => {});

  const [mode, setMode] = useState<ScreenMode>('explore');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { explore.load(); }, []);

  useEffect(() => {
    if (mode === 'search') {
      if (query.trim().length === 0) search.clear();
      else search.search(query.trim());
    }
  }, [query, mode]);

  const onFocusInput = () => { setMode('search'); setActiveCategory(null); };

  const onCancelSearch = () => {
    setQuery('');
    setMode('explore');
    setActiveCategory(null);
    search.clear();
    inputRef.current?.blur();
  };

  const onSelectCategory = (key: string) => {
    setActiveCategory(key);
    setMode('category');
    setQuery('');
    search.clear();
    search.search('', key);
    inputRef.current?.blur();
  };

  const onBackFromCategory = () => { setActiveCategory(null); setMode('explore'); search.clear(); };

  const activeCatMeta = CATEGORIES.find(c => c.key === activeCategory);

  const searchBarBg = isDark ? '#1A1A1A' : colors.surfaceAlt;
  const searchBarBorder = isDark ? '#2A2A2A' : colors.border;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header / search bar ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {mode === 'category' && (
          <TouchableOpacity onPress={onBackFromCategory} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: searchBarBg, borderColor: searchBarBorder, flex: 1 }]}
          onPress={mode !== 'search' ? onFocusInput : undefined}
          activeOpacity={1}
        >
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={mode === 'category' ? `Search in ${activeCatMeta?.label ?? ''}...` : 'Search debates...'}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onFocus={onFocusInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {(mode === 'search' || mode === 'category') && (
          <TouchableOpacity onPress={onCancelSearch} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {mode === 'explore' && (
        <ExploreDefault
          explore={explore}
          onSelectCategory={onSelectCategory}
          onRefresh={explore.load}
          colors={colors}
          isDark={isDark}
        />
      )}

      {mode === 'search' && (
        <SearchResults
          search={search}
          query={query}
          onLoadMore={search.loadMore}
          vote={vote}
          getUserVote={getUserVote}
          colors={colors}
        />
      )}

      {mode === 'category' && (
        <CategoryView
          search={search}
          activeCategory={activeCategory!}
          onLoadMore={search.loadMore}
          vote={vote}
          getUserVote={getUserVote}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

// ── Explore Default ───────────────────────────────────────────────────────────

function ExploreDefault({
  explore,
  onSelectCategory,
  onRefresh,
  colors,
  isDark,
}: {
  explore: ReturnType<typeof useExplore>;
  onSelectCategory: (key: string) => void;
  onRefresh: () => void;
  colors: ReturnType<typeof useColors>;
  isDark: boolean;
}) {
  if (explore.loading) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.skeletonContent} showsVerticalScrollIndicator={false}>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </ScrollView>
    );
  }

  if (explore.error && explore.top10Global.length === 0) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <EmptyState
          icon="compass-outline"
          heading="Couldn't load Explore"
          subtext="Pull down to try again"
          button={{ label: 'Try Again', onPress: onRefresh }}
        />
      </View>
    );
  }

  // Blowing Up: prefer polls with real velocity; fall back to top by count if fewer than 3 have velocity
  const blowingUpPolls = useMemo(() => {
    const withVelocity = explore.blowingUp.filter(p => (p.velocity ?? 0) > 0);
    if (withVelocity.length >= 3) return withVelocity;
    return [...explore.blowingUp].sort((a, b) => b.total_count - a.total_count);
  }, [explore.blowingUp]);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* A. Top 10 Globally */}
      {explore.top10Global.length > 0 && (
        <Section title="Top 10 Debates" subtitle="Most voted globally right now" isDark={isDark}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {explore.top10Global.map((poll, i) => (
              <Top10Card key={poll.id} poll={poll} rank={i + 1} />
            ))}
          </ScrollView>
        </Section>
      )}

      {/* B. Top 10 in Region */}
      {explore.top10Region.length > 0 && explore.regionName && (
        <Section
          title={`Top 10 in ${explore.regionName}`}
          subtitle="Most voted in your region"
          isDark={isDark}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {explore.top10Region.map((poll, i) => (
              <Top10Card key={poll.id} poll={poll} rank={i + 1} />
            ))}
          </ScrollView>
        </Section>
      )}

      {/* C. Blowing Up */}
      {blowingUpPolls.length > 0 && (
        <Section title="Blowing Up" subtitle="Fastest growing right now" isDark={isDark}>
          <View style={styles.blowingUpList}>
            {blowingUpPolls.map(poll => (
              <BlowingUpRow key={poll.id} poll={poll} velocity={poll.velocity ?? 0} />
            ))}
          </View>
        </Section>
      )}

      {/* D. Almost Universal */}
      {explore.universal.length > 0 && (
        <Section title="Almost Universal" subtitle="Rare consensus — 90%+ agree or disagree" isDark={isDark}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollGap10}>
            {explore.universal.map(poll => (
              <ConsensusCard key={poll.id} poll={poll} type="universal" />
            ))}
          </ScrollView>
        </Section>
      )}

      {/* E. The World is Divided */}
      {explore.divided.length > 0 && (
        <Section title="The World is Divided" subtitle="No consensus — perfectly split" isDark={isDark}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollGap10}>
            {explore.divided.map(poll => (
              <ConsensusCard key={poll.id} poll={poll} type="divided" />
            ))}
          </ScrollView>
        </Section>
      )}

      {/* F. Browse by Topic */}
      <Section title="Browse by Topic" subtitle="" isDark={isDark}>
        <TopicGrid
          categoryCounts={explore.categoryCounts}
          onSelect={onSelectCategory}
          colors={colors}
          isDark={isDark}
        />
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  isDark,
  children,
}: {
  title: string;
  subtitle: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F5F5F5' : '#111111' }]}>{title}</Text>
        {subtitle.length > 0 && (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

// ── Topic Grid ────────────────────────────────────────────────────────────────

function TopicGrid({
  categoryCounts,
  onSelect,
  colors,
  isDark,
}: {
  categoryCounts: CategoryCount[];
  onSelect: (key: string) => void;
  colors: ReturnType<typeof useColors>;
  isDark: boolean;
}) {
  const countMap: Record<string, number> = {};
  for (const cc of categoryCounts) countMap[cc.category] = cc.count;

  const tileBg = isDark ? '#161616' : colors.surface;
  const tileBorder = isDark ? '#252525' : colors.border;

  return (
    <View style={styles.topicGrid}>
      {CATEGORIES.map(cat => {
        const count = countMap[cat.key] ?? 0;
        const accentColor = CATEGORY_ACCENTS[cat.key] ?? '#6B7280';
        return (
          <TouchableOpacity
            key={cat.key}
            style={[styles.topicTile, { backgroundColor: tileBg, borderColor: tileBorder }]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.8}
          >
            {/* Corner accent */}
            <View style={[styles.tileAccent, { backgroundColor: accentColor }]} />
            <Text style={[styles.tileLabel, { color: colors.text }]}>{cat.label}</Text>
            <View style={styles.tilePill}>
              <Text style={styles.tilePillText}>
                {count > 0 ? `${count} ${count === 1 ? 'debate' : 'debates'}` : 'No debates'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Section skeleton ──────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <View style={styles.skeletonSection}>
      <View style={styles.skeletonTitle} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
    </View>
  );
}

// ── Connected poll card ───────────────────────────────────────────────────────

type VoteFn = (pollId: string, value: 1 | -1, yes: number, no: number, total: number) => Promise<void>;
type GetVoteFn = (pollId: string) => 1 | -1 | null;

function ConnectedPollCard({ poll, index, vote, getUserVote }: { poll: PollWithCounts; index: number; vote: VoteFn; getUserVote: GetVoteFn }) {
  const handleVote = useCallback(async (pollId: string, value: 1 | -1) => {
    await vote(pollId, value, poll.yes_count, poll.no_count, poll.total_count);
  }, [vote, poll.yes_count, poll.no_count, poll.total_count]);

  const userVote = getUserVote(poll.id) ?? poll.user_vote;
  return <PollCard poll={poll} index={index} userVote={userVote} onVote={handleVote} />;
}

// ── Search Results ────────────────────────────────────────────────────────────

function SearchResults({ search, query, onLoadMore, vote, getUserVote, colors }: { search: ReturnType<typeof useSearch>; query: string; onLoadMore: () => void; vote: VoteFn; getUserVote: GetVoteFn; colors: ReturnType<typeof useColors> }) {
  if (query.trim().length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>Type to search debates</Text>
      </View>
    );
  }

  if (search.loading) {
    return (
      <ScrollView contentContainerStyle={styles.skeletonContent} showsVerticalScrollIndicator={false}>
        <PollCardSkeleton /><PollCardSkeleton /><PollCardSkeleton />
      </ScrollView>
    );
  }

  if (search.error && search.polls.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="wifi-outline" heading="Search failed" subtext="Check your connection and try again" />
      </View>
    );
  }

  if (search.polls.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="search-outline" heading={`No debates found for "${query}"`} subtext="Try different words or browse by topic" />
      </View>
    );
  }

  return (
    <FlatList
      data={search.polls}
      keyExtractor={p => p.id}
      renderItem={({ item, index }) => <ConnectedPollCard poll={item} index={index} vote={vote} getUserVote={getUserVote} />}
      contentContainerStyle={styles.listContent}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={
        search.loadingMore ? <ActivityIndicator color={colors.accent} style={styles.footerSpinner} /> : null
      }
    />
  );
}

// ── Category View ─────────────────────────────────────────────────────────────

function CategoryView({ search, activeCategory, onLoadMore, vote, getUserVote, colors }: { search: ReturnType<typeof useSearch>; activeCategory: string; onLoadMore: () => void; vote: VoteFn; getUserVote: GetVoteFn; colors: ReturnType<typeof useColors> }) {
  const catMeta = CATEGORIES.find(c => c.key === activeCategory);

  if (search.loading) {
    return (
      <ScrollView contentContainerStyle={styles.skeletonContent} showsVerticalScrollIndicator={false}>
        <PollCardSkeleton /><PollCardSkeleton /><PollCardSkeleton />
      </ScrollView>
    );
  }

  if (search.polls.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="folder-open-outline"
          heading={`No debates in ${catMeta?.label ?? activeCategory} yet`}
          subtext="Start one"
          button={{ label: 'Start a Debate', onPress: () => router.navigate('/(tabs)/submit') }}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={search.polls}
      keyExtractor={p => p.id}
      renderItem={({ item, index }) => <ConnectedPollCard poll={item} index={index} vote={vote} getUserVote={getUserVote} />}
      contentContainerStyle={styles.listContent}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.catHeader}>
          <Text style={[styles.catHeaderText, { color: colors.text }]}>
            {catMeta?.label ?? activeCategory}
          </Text>
          <Text style={[styles.catHeaderCount, { color: colors.textTertiary }]}>
            {search.polls.length}{search.hasMore ? '+' : ''} debates
          </Text>
        </View>
      }
      ListFooterComponent={
        search.loadingMore ? <ActivityIndicator color={colors.accent} style={styles.footerSpinner} /> : null
      }
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { paddingRight: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 11,
    gap: 8,
    minHeight: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  cancelBtn: { paddingLeft: 4 },
  cancelText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  scrollContent: { paddingBottom: 32 },
  listContent: { paddingBottom: 32 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  // ── Sections
  section: {
    marginBottom: 28,
  },
  sectionHeading: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#555555',
    marginTop: 2,
  },
  hScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  hScrollGap10: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  blowingUpList: {
    paddingHorizontal: 16,
  },
  // ── Topic grid
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  topicTile: {
    width: '47.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    minHeight: 72,
    position: 'relative',
    overflow: 'hidden',
    gap: 0,
  },
  tileAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 36,
    opacity: 0.15,
  },
  tileLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 6,
  },
  tilePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tilePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#666666',
  },
  // ── Skeleton
  skeletonContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  skeletonSection: {
    marginBottom: 32,
    gap: 12,
    paddingHorizontal: 16,
  },
  skeletonTitle: {
    height: 20,
    width: 180,
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
  },
  skeletonCard: {
    width: 240,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
  },
  // ── Category view header
  catHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 2,
  },
  catHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
  },
  catHeaderCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  footerSpinner: { marginVertical: 16 },
});
