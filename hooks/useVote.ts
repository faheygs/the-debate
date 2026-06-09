import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { castVote } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { PollDetailResponse } from '@/types/database';

type VoteMap = Record<string, 1 | -1>;

const CLOSED_ERROR = 'This debate has closed';

function voteKey(userId: string) {
  return `voted_polls_${userId}`;
}

export function useVote(
  onCountsUpdate: (pollId: string, yes: number, no: number, total: number) => void,
  onError: (message: string) => void,
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const [votes, setVotes] = useState<VoteMap>({});
  const votesRef = useRef<VoteMap>({});
  const userIdRef = useRef<string | null>(userId);

  const closedRef = useRef<Record<string, true>>({});
  const [closedSnapshot, setClosedSnapshot] = useState<Record<string, true>>({});

  function loadVotesForUser(uid: string) {
    AsyncStorage.getItem(voteKey(uid))
      .then(raw => {
        const parsed = raw ? (JSON.parse(raw) as VoteMap) : {};
        votesRef.current = parsed;
        setVotes(parsed);
      })
      .catch(() => {});
  }

  function clearVoteState() {
    votesRef.current = {};
    setVotes({});
    closedRef.current = {};
    setClosedSnapshot({});
  }

  // Watch userId from context — load votes on sign-in, clear on sign-out
  useEffect(() => {
    userIdRef.current = userId;
    if (userId) {
      loadVotesForUser(userId);
    } else {
      clearVoteState();
    }
  }, [userId]);

  const persist = useCallback((map: VoteMap) => {
    const uid = userIdRef.current;
    if (!uid) return;
    AsyncStorage.setItem(voteKey(uid), JSON.stringify(map)).catch(() => {});
  }, []);

  const getUserVote = useCallback(
    (pollId: string): 1 | -1 | null => votes[pollId] ?? null,
    [votes],
  );

  const isPollClosed = useCallback(
    (pollId: string): boolean => !!closedSnapshot[pollId],
    [closedSnapshot],
  );

  const vote = useCallback(async (
    pollId: string,
    value: 1 | -1,
    currentYes: number,
    currentNo: number,
    currentTotal: number,
  ) => {
    if (votesRef.current[pollId] !== undefined) return;

    // Optimistic update
    const newYes = value === 1 ? currentYes + 1 : currentYes;
    const newNo = value === -1 ? currentNo + 1 : currentNo;
    const newTotal = currentTotal + 1;

    const updated: VoteMap = { ...votesRef.current, [pollId]: value };
    votesRef.current = updated;
    setVotes(updated);
    onCountsUpdate(pollId, newYes, newNo, newTotal);

    try {
      const result = await castVote(pollId, value);
      persist(votesRef.current);
      onCountsUpdate(pollId, result.yes_count, result.no_count, result.total);

      // Also update the poll detail cache so navigating there shows fresh counts
      queryClient.setQueryData(
        ['poll', pollId, userIdRef.current],
        (prev: PollDetailResponse | undefined) =>
          prev
            ? { ...prev, yes_count: result.yes_count, no_count: result.no_count, total_count: result.total, user_vote: value }
            : prev,
      );
    } catch (e: any) {
      // Revert
      const reverted = { ...votesRef.current };
      delete reverted[pollId];
      votesRef.current = reverted;
      setVotes(reverted);
      onCountsUpdate(pollId, currentYes, currentNo, currentTotal);

      const msg: string = e?.message ?? 'Failed to cast vote';
      if (msg === CLOSED_ERROR) {
        closedRef.current[pollId] = true;
        setClosedSnapshot({ ...closedRef.current });
      }
      onError(msg);
    }
  }, [onCountsUpdate, onError, persist, queryClient]);

  const initVote = useCallback((pollId: string, value: 1 | -1) => {
    if (votesRef.current[pollId] !== undefined) return;
    const updated: VoteMap = { ...votesRef.current, [pollId]: value };
    votesRef.current = updated;
    setVotes(updated);
    persist(updated);
  }, [persist]);

  return { getUserVote, vote, initVote, isPollClosed };
}
