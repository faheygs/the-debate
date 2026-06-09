import { useRef, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
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
  error?: string | null;
  loadMoreError?: string | null;
  getUserVote: (pollId: string) => 1 | -1 | null;
  onVote: (pollId: string, value: 1 | -1) => void;
  onUpvote?: (pollId: string) => void;
  onTagPress?: (tag: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onRetry?: () => void;
  onCountsUpdate: (pollId: string, yes: number, no: number, total: number) => void;
}

export function FeedList({
  polls,
  loading,
  refreshing,
  hasMore,
  error,
  loadMoreError,
  getUserVote,
  onVote,
  onUpvote,
  onTagPress,
  onLoadMore,
  onRefresh,
  onRetry,
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
    for (const item of viewableItems) {
      subscribeIfNeeded(item.item.id);
    }
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
      tintColor={colors.accent}
      colors={[colors.accent]}
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

  if (error && polls.length === 0) {
    return (
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={styles.emptyContainer}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          icon="wifi-outline"
          heading="Couldn't load debates"
          subtext="Check your connection and pull to refresh"
          button={onRetry ? { label: 'Try Again', onPress: onRetry } : undefined}
        />
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
          icon="chatbubbles-outline"
          heading="No debates here yet"
          subtext="Be the first to start one"
          button={{ label: 'Start a Debate', onPress: () => router.navigate('/(tabs)/submit') }}
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
          onTagPress={onTagPress}
        />
      )}
      onEndReached={hasMore && !loadMoreError ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      maxToRenderPerBatch={8}
      windowSize={5}
      initialNumToRender={6}
      ListFooterComponent={
        loadMoreError ? (
          <TouchableOpacity style={styles.loadMoreError} onPress={onLoadMore} activeOpacity={0.7}>
            <Text style={[styles.loadMoreErrorText, { color: colors.textTertiary }]}>
              Couldn't load more — tap to retry
            </Text>
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  skeletonContainer: { paddingHorizontal: 16, paddingTop: 12 },
  emptyContainer: { flex: 1 },
  loadMoreError: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreErrorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
});
