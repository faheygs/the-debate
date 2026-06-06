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

  // Realtime: new comments pushed from submit-comment broadcast
  useEffect(() => {
    const unsub = subscribeToPollComments(pollId, ({ comment }) => {
      setData((prev) => {
        if (!prev) return prev;
        // Deduplicate — Realtime may fire on the same device that submitted
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

  const addComment = useCallback((comment: PublicComment) => {
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

  return { data, loading, error, updateCounts, addComment, refetch: load };
}
