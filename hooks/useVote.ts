import { useState, useCallback } from 'react';
import { castVote } from '@/lib/api';

type VoteMap = Record<string, 1 | -1>;

export function useVote(
  onCountsUpdate: (pollId: string, yes: number, no: number, total: number) => void,
  onError: (message: string) => void,
) {
  const [votes, setVotes] = useState<VoteMap>({});

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
    if (votes[pollId] !== undefined) return;

    // Optimistic update
    const newYes = value === 1 ? currentYes + 1 : currentYes;
    const newNo = value === -1 ? currentNo + 1 : currentNo;
    const newTotal = currentTotal + 1;

    setVotes(v => ({ ...v, [pollId]: value }));
    onCountsUpdate(pollId, newYes, newNo, newTotal);

    try {
      const result = await castVote(pollId, value);
      onCountsUpdate(pollId, result.yes_count, result.no_count, result.total);
    } catch (e: any) {
      // Revert
      setVotes(v => { const n = { ...v }; delete n[pollId]; return n; });
      onCountsUpdate(pollId, currentYes, currentNo, currentTotal);
      onError(e?.message ?? 'Failed to cast vote');
    }
  }, [votes, onCountsUpdate, onError]);

  return { getUserVote, vote };
}
