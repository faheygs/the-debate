import { useState, useCallback, useRef } from 'react';
import { fetchFeed } from '@/lib/api';
import type { PollWithCounts } from '@/types/database';

export type FeedMode = 'trending' | 'fresh' | 'closest' | 'for_you' | 'review';

export interface FeedState {
  polls: PollWithCounts[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  cursor: string | null;
  mode: FeedMode;
}

export function useFeed() {
  const [state, setState] = useState<FeedState>({
    polls: [],
    loading: false,
    refreshing: false,
    error: null,
    hasMore: true,
    cursor: null,
    mode: 'trending',
  });

  const fetchingRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const doFetch = useCallback(async (
    mode: FeedMode,
    cursor: string | null,
    isRefresh: boolean,
  ) => {
    if (fetchingRef.current && !isRefresh) return;
    fetchingRef.current = true;

    // ── DEBUG ──────────────────────────────────────────────────────────────
    console.log(`[useFeed] doFetch mode=${mode} cursor=${cursor ?? 'null'} isRefresh=${isRefresh}`);
    // ───────────────────────────────────────────────────────────────────────

    setState(s => ({
      ...s,
      loading: cursor === null && !isRefresh ? true : s.loading,
      refreshing: isRefresh,
      error: null,
    }));

    try {
      const data = await fetchFeed(mode, cursor);
      console.log(`[useFeed] fetch success: ${data.polls?.length ?? 0} polls, has_more=${data.has_more}, next_cursor=${data.cursor ?? 'null'}`);
      setState(s => ({
        ...s,
        polls: isRefresh || cursor === null
          ? data.polls
          : [...s.polls, ...data.polls],
        loading: false,
        refreshing: false,
        hasMore: data.has_more,
        cursor: data.cursor,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useFeed] fetch FAILED:', message, err);
      setState(s => ({ ...s, loading: false, refreshing: false, error: message }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const initialLoad = useCallback(() => {
    doFetch(stateRef.current.mode, null, false);
  }, [doFetch]);

  const refresh = useCallback(() => {
    doFetch(stateRef.current.mode, null, true);
  }, [doFetch]);

  const loadMore = useCallback(() => {
    const { hasMore, cursor, mode, loading, refreshing } = stateRef.current;
    if (!hasMore || loading || refreshing || fetchingRef.current) return;
    doFetch(mode, cursor, false);
  }, [doFetch]);

  const switchMode = useCallback((newMode: FeedMode) => {
    setState(s => ({
      ...s,
      mode: newMode,
      polls: [],
      loading: true,
      refreshing: false,
      error: null,
      hasMore: true,
      cursor: null,
    }));
    doFetch(newMode, null, false);
  }, [doFetch]);

  const updatePollCounts = useCallback((
    pollId: string,
    yes: number,
    no: number,
    total: number,
  ) => {
    setState(s => ({
      ...s,
      polls: s.polls.map(p =>
        p.id === pollId
          ? { ...p, yes_count: yes, no_count: no, total_count: total }
          : p,
      ),
    }));
  }, []);

  const updatePollUpvote = useCallback((
    pollId: string,
    upvoteCount: number,
    userUpvoted: boolean,
  ) => {
    setState(s => ({
      ...s,
      polls: s.polls.map(p =>
        p.id === pollId
          ? { ...p, upvote_count: upvoteCount, user_upvoted: userUpvoted }
          : p,
      ),
    }));
  }, []);

  const prependPoll = useCallback((poll: PollWithCounts) => {
    setState(s => {
      // Deduplicate — don't prepend if already in list
      if (s.polls.some(p => p.id === poll.id)) return s;
      return { ...s, polls: [poll, ...s.polls] };
    });
  }, []);

  return { ...state, initialLoad, refresh, loadMore, switchMode, updatePollCounts, updatePollUpvote, prependPoll };
}
