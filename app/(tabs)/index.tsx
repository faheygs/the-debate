import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import { useFeed } from '@/hooks/useFeed';
import { useVote } from '@/hooks/useVote';
import { subscribeToFeed } from '@/lib/realtime';
import { upvotePoll, fetchSinglePoll } from '@/lib/api';
import { FeedList } from '@/components/feed/FeedList';
import { FeedModeTabs } from '@/components/feed/FeedModeTabs';
import { Toast } from '@/components/shared/Toast';
import type { FeedFilter } from '@/hooks/useFeed';

export default function FeedScreen() {
  const colors = useColors();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const feed = useFeed(filter);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, variant: 'error' | 'info' | 'success' = 'error') => {
    setToast({ message, variant });
  }, []);

  const { getUserVote, vote, initVote } = useVote(feed.updatePollCounts, showToast);

  useEffect(() => {
    for (const poll of feed.polls) {
      if (poll.user_vote != null) {
        initVote(poll.id, poll.user_vote);
      }
    }
  }, [feed.polls]);

  useEffect(() => {
    const unsub = subscribeToFeed((delta) => {
      if (delta.new && delta.new.length > 0) {
        for (const pollId of delta.new) {
          fetchSinglePoll(pollId)
            .then(poll => feed.prependPoll(poll))
            .catch(() => feed.refresh());
        }
      }
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

  const handleTagPress = useCallback((tag: string) => {
    setFilter(`tag:${tag}`);
  }, []);

  const handleUpvote = useCallback((pollId: string) => {
    const poll = feed.polls.find(p => p.id === pollId);
    if (!poll) return;
    const newCount = (poll.upvote_count ?? 0) + 1;
    feed.updatePollUpvote(pollId, newCount, true);

    upvotePoll(pollId).then((result) => {
      feed.updatePollUpvote(pollId, result.upvote_count, true);
      if (result.promoted) feed.refresh();
    }).catch(() => {
      feed.updatePollUpvote(pollId, poll.upvote_count ?? 0, false);
      showToast('Failed to upvote. Please try again.', 'error');
    });
  }, [feed.polls, feed.updatePollUpvote, feed.refresh]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.appName, { color: colors.text }]}>The Debate</Text>
          <TouchableOpacity
            onPress={() => router.navigate('/search')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <FeedModeTabs active={filter} onSelect={setFilter} />

        <FeedList
          polls={feed.polls}
          loading={feed.loading}
          refreshing={feed.refreshing}
          hasMore={feed.hasMore}
          error={feed.error}
          loadMoreError={feed.loadMoreError}
          getUserVote={getUserVote}
          onVote={handleVote}
          onUpvote={handleUpvote}
          onTagPress={handleTagPress}
          onLoadMore={feed.loadMore}
          onRefresh={feed.refresh}
          onRetry={feed.refresh}
          onCountsUpdate={feed.updatePollCounts}
        />
      </SafeAreaView>

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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
  },
});
