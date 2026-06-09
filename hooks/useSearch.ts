import { useState, useCallback, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchSearch } from '@/lib/api';
import type { SearchResponse } from '@/types/database';

export function useSearch() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [rawQuery, setRawQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), 350);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const enabled = debouncedQuery.trim().length > 0 || category !== null;

  const query = useInfiniteQuery<SearchResponse, Error, { pages: SearchResponse[]; pageParams: (string | null)[] }, readonly [string, string | null, string, string | null], string | null>({
    queryKey: ['search', userId, debouncedQuery, category] as const,
    queryFn: ({ pageParam }) => fetchSearch(debouncedQuery || null, category, pageParam, 20),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const search = useCallback((q: string, cat?: string | null) => {
    setRawQuery(q);
    if (cat !== undefined) setCategory(cat ?? null);
    setLoadMoreError(null);
  }, []);

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    setLoadMoreError(null);
    query.fetchNextPage().catch(err => {
      setLoadMoreError(err instanceof Error ? err.message : 'Failed to load more');
    });
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const clear = useCallback(() => {
    setRawQuery('');
    setDebouncedQuery('');
    setCategory(null);
    setLoadMoreError(null);
  }, []);

  return {
    polls: query.data?.pages.flatMap(p => p.polls) ?? [],
    hasMore: query.hasNextPage ?? false,
    loading: enabled ? query.isLoading : false,
    loadingMore: query.isFetchingNextPage,
    error: loadMoreError ?? (query.error ? String(query.error) : null),
    search,
    loadMore,
    clear,
  };
}
