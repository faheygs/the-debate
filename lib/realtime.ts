import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type VoteUpdate = {
  yes: number;
  no: number;
  total: number;
};

export type FeedDelta = {
  promoted?: string[];
  demoted?: string[];
  new?: string[];
  expired?: string[];
  counts?: Record<string, { yes: number; no: number; total: number }>;
};

// Active channel registry — keyed by channel name
const channels = new Map<string, RealtimeChannel>();

// ── Feed ──────────────────────────────────────────────────────────────────

export function subscribeToFeed(onDelta: (delta: FeedDelta) => void): () => void {
  const name = "feed:global";

  if (channels.has(name)) {
    channels.get(name)!.unsubscribe();
  }

  const channel = supabase
    .channel(name)
    .on("broadcast", { event: "feed_delta" }, ({ payload }) => {
      onDelta(payload as FeedDelta);
    })
    .subscribe();

  channels.set(name, channel);

  return () => unsubscribeFromChannel(name);
}

// ── Poll vote counts ──────────────────────────────────────────────────────

export function subscribeToPoll(
  pollId: string,
  onVoteUpdate: (update: VoteUpdate) => void,
): () => void {
  const name = `poll:${pollId}`;

  if (channels.has(name)) {
    channels.get(name)!.unsubscribe();
  }

  const channel = supabase
    .channel(name)
    .on("broadcast", { event: "vote_update" }, ({ payload }) => {
      onVoteUpdate(payload as VoteUpdate);
    })
    .subscribe();

  channels.set(name, channel);

  return () => unsubscribeFromChannel(name);
}

// ── Poll comments ─────────────────────────────────────────────────────────

export type CommentBroadcast = {
  comment: {
    id: string;
    content: string;
    age_range: string | null;
    region: string | null;
    created_at: string;
  };
};

export function subscribeToPollComments(
  pollId: string,
  onComment: (payload: CommentBroadcast) => void,
): () => void {
  const name = `poll:${pollId}:comments`;

  if (channels.has(name)) {
    channels.get(name)!.unsubscribe();
  }

  const channel = supabase
    .channel(name)
    .on("broadcast", { event: "new_comment" }, ({ payload }) => {
      onComment(payload as CommentBroadcast);
    })
    .subscribe();

  channels.set(name, channel);

  return () => unsubscribeFromChannel(name);
}

// ── Private user channel (moderation results) ─────────────────────────────

export type ModerationResult = {
  poll_id: string;
  approved: boolean;
  reason?: string;
};

export function subscribeToUserPrivate(
  userId: string,
  onModeration: (result: ModerationResult) => void,
): () => void {
  const name = `user:${userId}:private`;

  if (channels.has(name)) {
    channels.get(name)!.unsubscribe();
  }

  const channel = supabase
    .channel(name)
    .on("broadcast", { event: "moderation_result" }, ({ payload }) => {
      onModeration(payload as ModerationResult);
    })
    .subscribe();

  channels.set(name, channel);

  return () => unsubscribeFromChannel(name);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function unsubscribeFromChannel(name: string) {
  const ch = channels.get(name);
  if (ch) {
    ch.unsubscribe();
    channels.delete(name);
  }
}

export function unsubscribeFromPoll(pollId: string) {
  unsubscribeFromChannel(`poll:${pollId}`);
  unsubscribeFromChannel(`poll:${pollId}:comments`);
}

export function unsubscribeAll() {
  for (const [name, channel] of channels) {
    channel.unsubscribe();
    channels.delete(name);
  }
}
