import { createContext, useContext, useCallback, useMemo, useState } from 'react';

interface PollState {
  yes_count: number;
  no_count: number;
  total_count: number;
  user_vote: 1 | -1 | null;
}

interface PollStateContextValue {
  updatePollCounts: (pollId: string, yes: number, no: number, total: number) => void;
  markPollVoted: (pollId: string, value: 1 | -1) => void;
  getPollState: (pollId: string) => PollState | null;
}

const PollStateContext = createContext<PollStateContextValue>({
  updatePollCounts: () => {},
  markPollVoted: () => {},
  getPollState: () => null,
});

export function PollStateProvider({ children }: { children: React.ReactNode }) {
  const [stateMap, setStateMap] = useState<Record<string, PollState>>({});

  const updatePollCounts = useCallback((pollId: string, yes: number, no: number, total: number) => {
    setStateMap(prev => ({
      ...prev,
      [pollId]: {
        yes_count: yes,
        no_count: no,
        total_count: total,
        user_vote: prev[pollId]?.user_vote ?? null,
      },
    }));
  }, []);

  const markPollVoted = useCallback((pollId: string, value: 1 | -1) => {
    setStateMap(prev => ({
      ...prev,
      [pollId]: {
        ...(prev[pollId] ?? { yes_count: 0, no_count: 0, total_count: 0 }),
        user_vote: value,
      },
    }));
  }, []);

  const value = useMemo<PollStateContextValue>(
    () => ({
      updatePollCounts,
      markPollVoted,
      getPollState: (pollId: string) => stateMap[pollId] ?? null,
    }),
    [stateMap, updatePollCounts, markPollVoted],
  );

  return <PollStateContext.Provider value={value}>{children}</PollStateContext.Provider>;
}

export function usePollState() {
  return useContext(PollStateContext);
}
