import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPoll } from '@/lib/api';
import { subscribeToPollComments } from '@/lib/realtime';
import type { PollDetailResponse, PublicComment } from '@/types/database';

export function usePollDetail(pollId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const queryKey = ['poll', pollId, userId] as const;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const query = useQuery<PollDetailResponse, Error>({
    queryKey,
    queryFn: () => fetchPoll(pollId),
    staleTime: 5 * 60 * 1000,
    enabled: !!pollId,
  });

  // Realtime: new comments from other users
  useEffect(() => {
    const unsub = subscribeToPollComments(pollId, ({ comment }) => {
      queryClient.setQueryData(queryKeyRef.current, (prev: PollDetailResponse | undefined) => {
        if (!prev) return prev;
        if (prev.comments.some(c => c.id === comment.id)) return prev;
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
    return unsub;
  }, [pollId, queryClient]);

  const updateCounts = useCallback((yes: number, no: number, total: number, userVote: 1 | -1) => {
    queryClient.setQueryData(queryKeyRef.current, (prev: PollDetailResponse | undefined) =>
      prev ? { ...prev, yes_count: yes, no_count: no, total_count: total, user_vote: userVote } : prev
    );
  }, [queryClient]);

  const addOptimisticComment = useCallback((comment: PublicComment) => {
    queryClient.setQueryData(queryKeyRef.current, (prev: PollDetailResponse | undefined) => {
      if (!prev) return prev;
      return { ...prev, comments: [comment, ...prev.comments], has_commented: true, user_comment: comment.content };
    });
  }, [queryClient]);

  const confirmComment = useCallback((tempId: string, realComment: PublicComment) => {
    queryClient.setQueryData(queryKeyRef.current, (prev: PollDetailResponse | undefined) => {
      if (!prev) return prev;
      // Realtime may have already added the real comment — just drop the temp entry
      const realtimeAlreadyAdded = prev.comments.some(c => c.id === realComment.id && c.id !== tempId);
      if (realtimeAlreadyAdded) {
        return { ...prev, comments: prev.comments.filter(c => c.id !== tempId), user_comment: realComment.content };
      }
      return {
        ...prev,
        comments: prev.comments.map(c => c.id === tempId ? { ...realComment, pending: false } : c),
        user_comment: realComment.content,
      };
    });
  }, [queryClient]);

  const removeComment = useCallback((tempId: string) => {
    queryClient.setQueryData(queryKeyRef.current, (prev: PollDetailResponse | undefined) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments.filter(c => c.id !== tempId),
        has_commented: false,
        user_comment: null,
      };
    });
  }, [queryClient]);

  const updateOpinionVote = useCallback((
    commentId: string,
    value: 1 | -1 | null,
    netScore: number,
    upCount: number,
    downCount: number,
  ) => {
    queryClient.setQueryData(queryKeyRef.current, (prev: PollDetailResponse | undefined) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments.map(c =>
          c.id === commentId
            ? { ...c, net_score: netScore, user_opinion_vote: value, up_count: upCount, down_count: downCount }
            : c
        ),
      };
    });
  }, [queryClient]);

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    updateCounts,
    addOptimisticComment,
    confirmComment,
    removeComment,
    updateOpinionVote,
    refetch: query.refetch,
  };
}
