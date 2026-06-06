import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchPoll } from '@/lib/api';
import { subscribeToPollComments } from '@/lib/realtime';
import type { PollDetailResponse, PublicComment } from '@/types/database';

export function usePollDetail(pollId: string) {
  const [data, setData] = useState<PollDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPoll(pollId);
      if (mountedRef.current) setData(result);
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load poll');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Realtime: new comments from other users (or Realtime winning the race on submit)
  useEffect(() => {
    const unsub = subscribeToPollComments(pollId, ({ comment }) => {
      setData((prev) => {
        if (!prev) return prev;
        // Deduplicate by real ID — covers both Realtime-first and confirm-first races
        if (prev.comments.some((c) => c.id === comment.id)) return prev;
        const newComment: PublicComment = {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          age_range: comment.age_range,
          region_detail: comment.region_detail,
          political_lean: comment.political_lean,
        };
        return { ...prev, comments: [newComment, ...prev.comments] };
      });
    });
    return () => {
      unsub();
    };
  }, [pollId]);

  const updateCounts = useCallback(
    (yes: number, no: number, total: number, userVote: 1 | -1) => {
      setData((prev) =>
        prev
          ? { ...prev, yes_count: yes, no_count: no, total_count: total, user_vote: userVote }
          : prev,
      );
    },
    [],
  );

  // Optimistic: immediately add a pending comment and flip has_commented
  const addOptimisticComment = useCallback((comment: PublicComment) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [comment, ...prev.comments],
        has_commented: true,
        user_comment: comment.content,
      };
    });
  }, []);

  // Confirm: swap the temp ID for the real comment in-place
  const confirmComment = useCallback((tempId: string, realComment: PublicComment) => {
    setData((prev) => {
      if (!prev) return prev;
      // If Realtime already added the real comment, just drop the temp
      const realtimeAlreadyAdded = prev.comments.some(
        (c) => c.id === realComment.id && c.id !== tempId,
      );
      if (realtimeAlreadyAdded) {
        return {
          ...prev,
          comments: prev.comments.filter((c) => c.id !== tempId),
          user_comment: realComment.content,
        };
      }
      // Replace temp entry with the confirmed comment (remove pending flag)
      return {
        ...prev,
        comments: prev.comments.map((c) =>
          c.id === tempId ? { ...realComment, pending: false } : c,
        ),
        user_comment: realComment.content,
      };
    });
  }, []);

  // Remove: drop a failed/blocked optimistic comment and reset commented state
  const removeComment = useCallback((tempId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments.filter((c) => c.id !== tempId),
        has_commented: false,
        user_comment: null,
      };
    });
  }, []);

  return {
    data,
    loading,
    error,
    updateCounts,
    addOptimisticComment,
    confirmComment,
    removeComment,
    refetch: load,
  };
}
