import { useRef, useCallback } from 'react';
import { FlatList, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { subscribeToPoll } from '@/lib/realtime';
import { PollCard } from './PollCard';
import { PollCardSkeleton } from './PollCardSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useColors } from '@/constants/colors';
import type { PollWithCounts } from '@/types/database';

const MAX_POLL_SUBS = 5;

interface Props {
  polls: PollWithCounts[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  getUserVote: (pollId: string) => 1 | -1 | null;
  onVote: (pollId: string, value: 1 | -1) => void;
  onUpvote?: (pollId: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onCountsUpdate: (pollId: string, yes: number, no: number, total: number) => void;
}

export function FeedList({
  polls,
  loading,
  refreshing,
  hasMore,
  getUserVote,
  onVote,
  onUpvote,
  onLoadMore,
  onRefresh,
  onCountsUpdate,
}: Props) {
  const colors = useColors();
  // Map of pollId → unsubscribe fn
  const subsRef = useRef<Map<string, () => void>>(new Map());

  const subscribeIfNeeded = useCallback((pollId: string) => {
    if (subsRef.current.has(pollId)) return;

    // Enforce max 5 active subs — drop oldest
    if (subsRef.current.size >= MAX_POLL_SUBS) {
      const oldest = subsRef.current.keys().next().value as string;
      subsRef.current.get(oldest)?.();
      subsRef.current.delete(oldest);
    }

    const unsub = subscribeToPoll(pollId, (update) => {
      onCountsUpdate(pollId, update.yes, update.no, update.total);
    });
    subsRef.current.set(pollId, unsub);
  }, [onCountsUpdate]);

  const unsubscribeIfPresent = useCallback((pollId: string) => {
    const unsub = subsRef.current.get(pollId);
    if (unsub) {
      unsub();
      subsRef.current.delete(pollId);
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems, changed }: any) => {
    // Subscribe to newly visible polls
    for (const item of viewableItems) {
      subscribeIfNeeded(item.item.id);
    }
    // Unsubscribe from polls that scrolled out
    for (const item of changed) {
      if (!item.isViewable) {
        unsubscribeIfPresent(item.item.id);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  if (loading && polls.length === 0) {
    return (
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={styles.skeletonContainer}
        showsVerticalScrollIndicator={false}
      >
        {[0, 1, 2, 3, 4].map(i => <PollCardSkeleton key={i} />)}
      </ScrollView>
    );
  }

  if (!loading && polls.length === 0) {
    return (
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={styles.emptyContainer}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          icon="flame-outline"
          heading="Nothing here yet"
          subtext="Pull down to refresh or try a different mode."
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={polls}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => (
        <PollCard
          poll={item}
          index={index}
          userVote={getUserVote(item.id)}
          onVote={onVote}
          onUpvote={onUpvote}
        />
      )}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  skeletonContainer: { paddingHorizontal: 16, paddingTop: 12 },
  emptyContainer: { flex: 1 },
});
