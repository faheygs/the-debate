import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchExplore, fetchSearch } from '@/lib/api';
import type { PollWithCounts, CategoryCount } from '@/types/database';

const STALE_TIME = 1000 * 60 * 3; // 3 minutes

function unvoted(polls: PollWithCounts[]): PollWithCounts[] {
  return polls.filter(p => p.user_vote === null || p.user_vote === undefined);
}

export function useExplore() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const top10GlobalQuery = useQuery({
    queryKey: ['explore', userId, 'top10_global'] as const,
    queryFn: () => fetchExplore('top10_global'),
    staleTime: STALE_TIME,
    enabled: !!userId,
  });

  const top10RegionQuery = useQuery({
    queryKey: ['explore', userId, 'top10_region'] as const,
    queryFn: () => fetchExplore('top10_region'),
    staleTime: STALE_TIME,
    enabled: !!userId,
  });

  const blowingUpQuery = useQuery({
    queryKey: ['explore', userId, 'blowing_up'] as const,
    queryFn: () => fetchExplore('blowing_up'),
    staleTime: STALE_TIME,
    enabled: !!userId,
  });

  const universalQuery = useQuery({
    queryKey: ['explore', userId, 'universal'] as const,
    queryFn: () => fetchExplore('universal'),
    staleTime: STALE_TIME,
    enabled: !!userId,
  });

  const dividedQuery = useQuery({
    queryKey: ['explore', userId, 'divided'] as const,
    queryFn: () => fetchExplore('divided'),
    staleTime: STALE_TIME,
    enabled: !!userId,
  });

  const categoryCountsQuery = useQuery({
    queryKey: ['explore', 'categories'] as const,
    queryFn: () => fetchSearch(null, null),
    staleTime: 10 * 60 * 1000,
  });

  const loading = (top10GlobalQuery.isLoading && !top10GlobalQuery.data)
    || (blowingUpQuery.isLoading && !blowingUpQuery.data);

  const error = top10GlobalQuery.error ?? blowingUpQuery.error ?? null;

  const load = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['explore'] });
  }, [queryClient]);

  return {
    top10Global: unvoted(top10GlobalQuery.data?.polls ?? []),
    top10Region: unvoted(top10RegionQuery.data?.polls ?? []),
    regionName: top10RegionQuery.data?.region ?? null,
    blowingUp: unvoted(blowingUpQuery.data?.polls ?? []),
    universal: unvoted(universalQuery.data?.polls ?? []),
    divided: unvoted(dividedQuery.data?.polls ?? []),
    categoryCounts: (categoryCountsQuery.data?.category_counts ?? []) as CategoryCount[],
    loading,
    error: error ? String(error) : null,
    load,
    // individual loading states for progressive rendering
    loadingRegion: top10RegionQuery.isLoading,
    loadingBlowingUp: blowingUpQuery.isLoading,
    loadingUniversal: universalQuery.isLoading,
    loadingDivided: dividedQuery.isLoading,
  };
}
