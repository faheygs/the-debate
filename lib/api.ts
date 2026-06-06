import { supabase } from './supabase';
import type { FeedResponse, CastVoteResponse, PollDetailResponse } from '@/types/database';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFeed(
  mode: 'trending' | 'fresh' | 'closest' | 'for_you',
  cursor?: string | null,
  limit = 20,
): Promise<FeedResponse> {
  const headers = await authHeaders();
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${BASE}/feed?${params}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
}

export async function castVote(
  pollId: string,
  value: 1 | -1,
): Promise<CastVoteResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/cast-vote`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ poll_id: pollId, value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || 'Failed to cast vote');
  }
  return res.json();
}

export async function fetchPoll(pollId: string): Promise<PollDetailResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/poll/${pollId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch poll');
  return res.json();
}
