import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import { useFeed } from '@/hooks/useFeed';
import { useVote } from '@/hooks/useVote';
import { subscribeToFeed } from '@/lib/realtime';
import { FeedList } from '@/components/feed/FeedList';
import { FeedModeTabs } from '@/components/feed/FeedModeTabs';
import { Toast } from '@/components/shared/Toast';

export default function FeedScreen() {
  const colors = useColors();
  const feed = useFeed();
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, variant: 'error' | 'info' | 'success' = 'error') => {
    setToast({ message, variant });
  }, []);

  const { getUserVote, vote, initVote } = useVote(feed.updatePollCounts, showToast);

  // Load feed on mount
  useEffect(() => {
    feed.initialLoad();
  }, []);

  // Hydrate voted state from server-returned user_vote on every page load/refresh.
  // initVote is idempotent — skips polls already in the voted map.
  useEffect(() => {
    for (const poll of feed.polls) {
      if (poll.user_vote != null) {
        initVote(poll.id, poll.user_vote);
      }
    }
  }, [feed.polls]);

  // Realtime feed:global subscription
  useEffect(() => {
    const unsub = subscribeToFeed((delta) => {
      // When new polls appear in the feed channel, refresh to pick them up
      if (delta.new && delta.new.length > 0) {
        feed.refresh();
      }
      // Update counts for any polls in the current list
      if (delta.counts) {
        for (const [pollId, counts] of Object.entries(delta.counts)) {
          feed.updatePollCounts(pollId, counts.yes, counts.no, counts.total);
        }
      }
    });
    return unsub;
  }, []);

  const handleVote = useCallback(async (pollId: string, value: 1 | -1) => {
    const poll = feed.polls.find(p => p.id === pollId);
    if (!poll) return;
    await vote(pollId, value, poll.yes_count, poll.no_count, poll.total_count);
  }, [feed.polls, vote]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.appName, { color: colors.text }]}>The Debate</Text>
          <TouchableOpacity
            onPress={() => router.navigate('/search')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Mode tabs */}
        <FeedModeTabs active={feed.mode} onSelect={feed.switchMode} />

        {/* Feed */}
        <FeedList
          polls={feed.polls}
          loading={feed.loading}
          refreshing={feed.refreshing}
          hasMore={feed.hasMore}
          getUserVote={getUserVote}
          onVote={handleVote}
          onLoadMore={feed.loadMore}
          onRefresh={feed.refresh}
          onCountsUpdate={feed.updatePollCounts}
        />
      </SafeAreaView>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          visible={!!toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  appName: {
    fontFamily: 'Syne_700Bold',
    fontSize: 24,
  },
});
