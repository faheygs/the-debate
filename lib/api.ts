import { supabase } from './supabase';
import type { FeedResponse, CastVoteResponse, PollDetailResponse } from '@/types/database';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchFeed(
  mode: 'trending' | 'fresh' | 'closest' | 'for_you',
  cursor?: string | null,
  limit = 20,
): Promise<FeedResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const url = `${BASE}/feed?${params}`;

  // ── DEBUG ────────────────────────────────────────────────────────────────
  console.log('[api.fetchFeed] token:', token ? token.slice(0, 20) + '...' : 'MISSING — no session');
  console.log('[api.fetchFeed] url:', url);
  // ─────────────────────────────────────────────────────────────────────────

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    console.error('[api.fetchFeed] ERROR', res.status, body);
    throw new Error(`Feed ${res.status}: ${body}`);
  }

  const data = await res.json() as FeedResponse;
  console.log('[api.fetchFeed] polls received:', data.polls?.length ?? 0, '| has_more:', data.has_more);
  return data;
}

export async function castVote(
  pollId: string,
  value: 1 | -1,
): Promise<CastVoteResponse> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.log('[api.castVote] pollId:', pollId, 'value:', value, 'token:', token ? token.slice(0, 20) + '...' : 'MISSING');

  const res = await fetch(`${BASE}/cast-vote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ poll_id: pollId, value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as any).error || `cast-vote ${res.status}`;
    console.error('[api.castVote] ERROR:', msg);
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchPoll(pollId: string): Promise<PollDetailResponse> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/poll/${pollId}`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`poll ${res.status}: ${body}`);
  }
  return res.json();
}

export async function submitComment(
  pollId: string,
  content: string,
): Promise<{ approved: boolean; comment?: import('@/types/database').PublicComment }> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/submit-comment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ poll_id: pollId, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `submit-comment ${res.status}`);
  }
  return res.json();
}

export async function flagComment(commentId: string): Promise<void> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/flag-comment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ comment_id: commentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `flag-comment ${res.status}`);
  }
}
