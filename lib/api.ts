import { supabase } from './supabase';
import type { FeedResponse, CastVoteResponse, PollDetailResponse, SubmitPollResponse, UpvotePollResponse, PersonalBoardResponse, GenerateInsightsResponse, SearchResponse } from '@/types/database';
import type { PollType } from '@/types/app';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchFeed(
  mode: 'trending' | 'fresh' | 'for_you' | 'review',
  cursor?: string | null,
  limit = 20,
  category?: string | null,
  timed?: boolean,
  tag?: string,
): Promise<FeedResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (category) params.set('category', category);
  if (timed) params.set('timed', 'true');
  if (tag) params.set('tag', tag);
  const url = `${BASE}/feed?${params}`;

  const t0 = Date.now();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    console.error('[api.fetchFeed] ERROR', res.status, body);
    throw new Error(`Feed ${res.status}: ${body}`);
  }

  const data = await res.json() as FeedResponse;
  console.log(`[api.fetchFeed] mode=${mode} polls=${data.polls?.length ?? 0} has_more=${data.has_more} time=${Date.now() - t0}ms`);
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

export async function fetchSinglePoll(pollId: string): Promise<import('@/types/database').PollWithCounts> {
  const data = await fetchPoll(pollId);
  return {
    ...data.poll,
    yes_count: data.yes_count,
    no_count: data.no_count,
    total_count: data.total_count,
    comment_count: data.comment_count,
    user_vote: data.user_vote,
  };
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

export async function submitPoll(
  question: string,
  pollType: PollType,
  category: string,
  optionA?: string,
  optionB?: string,
  tags?: string[],
): Promise<SubmitPollResponse> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body: Record<string, unknown> = { question, poll_type: pollType, category };
  if (optionA) body.option_a = optionA;
  if (optionB) body.option_b = optionB;
  if (tags && tags.length > 0) body.tags = tags;
  const res = await fetch(`${BASE}/submit-poll`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `submit-poll ${res.status}`);
  }
  return res.json();
}

export async function upvotePoll(pollId: string): Promise<UpvotePollResponse> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/upvote-poll`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ poll_id: pollId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `upvote-poll ${res.status}`);
  }
  return res.json();
}

export async function fetchExplore(
  mode: 'top10_global' | 'top10_region' | 'blowing_up' | 'universal' | 'divided',
): Promise<import('@/types/database').ExploreResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ explore: mode });
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/search?${params}`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`explore/${mode} ${res.status}: ${body}`);
  }
  return res.json();
}

export async function fetchSearch(
  q: string | null,
  category: string | null,
  cursor?: string | null,
  limit = 20,
  sort?: string,
): Promise<SearchResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ limit: String(limit) });
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (cursor) params.set('cursor', cursor);
  if (sort) params.set('sort', sort);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/search?${params}`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`search ${res.status}: ${body}`);
  }
  return res.json();
}

export async function fetchPersonalBoard(): Promise<PersonalBoardResponse> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/personal-board`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`personal-board ${res.status}: ${body}`);
  }
  return res.json();
}

export async function generateInsights(): Promise<GenerateInsightsResponse> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/generate-insights`, { method: 'POST', headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`generate-insights ${res.status}: ${body}`);
  }
  return res.json();
}

export async function voteOnOpinion(
  commentId: string,
  value: 1 | -1,
): Promise<{ net_score: number; up_count: number; down_count: number; user_vote: 1 | -1 | null }> {
  const token = await getToken();
  console.log('[api.voteOnOpinion] commentId:', commentId, 'value:', value);
  console.log('[api.voteOnOpinion] token:', token?.substring(0, 20));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/vote-opinion`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ comment_id: commentId, value }),
  });
  console.log('[api.voteOnOpinion] status:', res.status);
  const data = await res.json().catch((e: unknown) => {
    console.error('[api.voteOnOpinion] failed to parse response JSON:', e);
    return {};
  });
  console.log('[api.voteOnOpinion] response:', JSON.stringify(data));
  if (!res.ok) {
    throw new Error((data as any).error || `vote-opinion ${res.status}`);
  }
  return data;
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
