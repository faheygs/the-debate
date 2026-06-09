import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPersonalBoard } from '@/lib/api';

export function usePersonalBoard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ['board', userId] as const,
    queryFn: fetchPersonalBoard,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.isError,
    refetch: query.refetch,
  };
}
