import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { castVote } from '@/lib/api';

const STORAGE_KEY = 'voted_polls';
type VoteMap = Record<string, 1 | -1>;

export function useVote(
  onCountsUpdate: (pollId: string, yes: number, no: number, total: number) => void,
  onError: (message: string) => void,
) {
  const [votes, setVotes] = useState<VoteMap>({});
  // Ref keeps the always-current map accessible inside async callbacks
  // without adding `votes` as a dep and risking stale closures.
  const votesRef = useRef<VoteMap>({});

  // Load persisted votes on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as VoteMap;
        votesRef.current = parsed;
        setVotes(parsed);
      })
      .catch(() => {});
  }, []);

  const getUserVote = useCallback(
    (pollId: string): 1 | -1 | null => votes[pollId] ?? null,
    [votes],
  );

  const vote = useCallback(async (
    pollId: string,
    value: 1 | -1,
    currentYes: number,
    currentNo: number,
    currentTotal: number,
  ) => {
    if (votesRef.current[pollId] !== undefined) return;

    // Optimistic update — apply immediately before server response
    const newYes = value === 1 ? currentYes + 1 : currentYes;
    const newNo = value === -1 ? currentNo + 1 : currentNo;
    const newTotal = currentTotal + 1;

    const updated: VoteMap = { ...votesRef.current, [pollId]: value };
    votesRef.current = updated;
    setVotes(updated);
    onCountsUpdate(pollId, newYes, newNo, newTotal);

    try {
      const result = await castVote(pollId, value);
      // Persist confirmed vote — fire-and-forget
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(votesRef.current)).catch(() => {});
      onCountsUpdate(pollId, result.yes_count, result.no_count, result.total);
    } catch (e: any) {
      // Revert optimistic update on failure
      const reverted = { ...votesRef.current };
      delete reverted[pollId];
      votesRef.current = reverted;
      setVotes(reverted);
      onCountsUpdate(pollId, currentYes, currentNo, currentTotal);
      onError(e?.message ?? 'Failed to cast vote');
    }
  }, [onCountsUpdate, onError]);

  // Hydrate a known vote from the server without calling the API.
  // Used when the feed returns user_vote on a poll the user already voted on.
  const initVote = useCallback((pollId: string, value: 1 | -1) => {
    if (votesRef.current[pollId] !== undefined) return; // already known
    const updated: VoteMap = { ...votesRef.current, [pollId]: value };
    votesRef.current = updated;
    setVotes(updated);
    // Persist so subsequent app launches don't need to re-hydrate from server
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  return { getUserVote, vote, initVote };
}
