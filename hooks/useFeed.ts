import { useState, useCallback, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchFeed } from '@/lib/api';
import type { PollWithCounts, FeedResponse } from '@/types/database';

type FeedMode = 'trending' | 'fresh' | 'for_you' | 'review';

export type FeedFilter =
  | 'all'
  | 'for_you'
  | 'timed'
  | 'review'
  | 'politics'
  | 'culture'
  | 'food'
  | 'ethics'
  | 'sports'
  | 'tech'
  | 'relationships'
  | 'hypothetical'
  | 'news'
  | 'entertainment'
  | 'other'
  | `tag:${string}`;

function filterToParams(filter: FeedFilter): { mode: FeedMode; category?: string; timed?: boolean; tag?: string } {
  if (filter === 'all')          return { mode: 'trending' };
  if (filter === 'for_you')      return { mode: 'for_you' };
  if (filter === 'timed')        return { mode: 'fresh', timed: true };
  if (filter === 'review')       return { mode: 'review' };
  if (filter.startsWith('tag:')) return { mode: 'fresh', tag: filter.slice(4) };
  return { mode: 'fresh', category: filter };
}

export function useFeed(filter: FeedFilter) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const queryKey = ['feed', userId, filter] as const;
  // Ref so setQueryData callbacks always target the currently-visible cache entry
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const query = useInfiniteQuery<FeedResponse, Error, { pages: FeedResponse[]; pageParams: (string | null)[] }, readonly [string, string | null, FeedFilter], string | null>({
    queryKey,
    queryFn: ({ pageParam }) => {
      const params = filterToParams(filter);
      return fetchFeed(params.mode, pageParam, 20, params.category, params.timed, params.tag);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

  const polls = query.data?.pages.flatMap(p => p.polls) ?? [];
  const lastPage = query.data?.pages[query.data.pages.length - 1];
  const hasMore = lastPage?.has_more ?? true;
  const hasAnyData = (query.data?.pages.length ?? 0) > 0;

  const refresh = useCallback(() => {
    setLoadMoreError(null);
    query.refetch();
  }, [query.refetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || query.isFetchingNextPage) return;
    setLoadMoreError(null);
    query.fetchNextPage().catch(err => {
      setLoadMoreError(err instanceof Error ? err.message : 'Failed to load more');
    });
  }, [hasMore, query.isFetchingNextPage, query.fetchNextPage]);

  const updatePollCounts = useCallback((pollId: string, yes: number, no: number, total: number) => {
    queryClient.setQueryData(queryKeyRef.current, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          polls: page.polls.map((p: PollWithCounts) =>
            p.id === pollId ? { ...p, yes_count: yes, no_count: no, total_count: total } : p
          ),
        })),
      };
    });
  }, [queryClient]);

  const updatePollUpvote = useCallback((pollId: string, upvoteCount: number, userUpvoted: boolean) => {
    queryClient.setQueryData(queryKeyRef.current, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          polls: page.polls.map((p: PollWithCounts) =>
            p.id === pollId ? { ...p, upvote_count: upvoteCount, user_upvoted: userUpvoted } : p
          ),
        })),
      };
    });
  }, [queryClient]);

  const prependPoll = useCallback((poll: PollWithCounts) => {
    queryClient.setQueryData(queryKeyRef.current, (old: any) => {
      if (!old) return old;
      const firstPage = old.pages[0];
      if (!firstPage || firstPage.polls.some((p: PollWithCounts) => p.id === poll.id)) return old;
      return {
        ...old,
        pages: [
          { ...firstPage, polls: [poll, ...firstPage.polls] },
          ...old.pages.slice(1),
        ],
      };
    });
  }, [queryClient]);

  return {
    polls,
    loading: query.isLoading,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    error: query.isError && !hasAnyData ? String(query.error) : null,
    loadMoreError,
    hasMore,
    refresh,
    loadMore,
    updatePollCounts,
    updatePollUpvote,
    prependPoll,
  };
}
