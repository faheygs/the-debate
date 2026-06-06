import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    // ── Parse body ────────────────────────────────────────────────────────
    const { poll_id, content } = await req.json();
    if (!poll_id || typeof poll_id !== "string") {
      return json({ error: "poll_id required" }, 400);
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return json({ error: "content required" }, 400);
    }
    if (content.length > 150) {
      return json({ error: "Comment too long (max 150 characters)" }, 400);
    }
    const trimmedContent = content.trim();

    // ── User checks: ban + duplicate ──────────────────────────────────────
    const { data: userRow } = await supabase
      .from("users")
      .select("comment_banned, age_range, region_detail, political_lean")
      .eq("id", userId)
      .maybeSingle();

    if (userRow?.comment_banned) {
      return json({ error: "You have been banned from commenting" }, 403);
    }

    // Check DB for existing comment
    const { data: existing } = await supabase
      .from("comments")
      .select("id")
      .eq("poll_id", poll_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return json({ error: "You have already commented on this poll" }, 409);
    }

    // Redis fast-path duplicate gate
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });
    const redisKey = `user:${userId}:commented:${poll_id}`;
    const alreadyCommented = await redis.get(redisKey).catch(() => null);
    if (alreadyCommented) {
      return json({ error: "You have already commented on this poll" }, 409);
    }

    // ── Fetch poll question for moderation context ────────────────────────
    const { data: poll } = await supabase
      .from("polls")
      .select("question")
      .eq("id", poll_id)
      .maybeSingle();

    if (!poll) {
      return json({ error: "Poll not found" }, 404);
    }

    // ── Claude moderation ─────────────────────────────────────────────────
    let aiDecision: "approved" | "blocked" = "approved";
    let aiReason: string | null = null;
    let aiScore: number | null = null;

    try {
      const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
      const moderationResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: `You are a content moderator for a public anonymous debate platform.
BLOCK if: slurs/hate speech, personal attacks, off-topic, threats, spam.
APPROVE if: opinion related to poll, substantive even if strongly worded.
Respond ONLY with valid JSON: { "decision": "approve"|"block", "reason": "...", "score": 0.0-1.0 }`,
        messages: [{
          role: "user",
          content: `Poll question: "${poll.question}"\nUser comment: "${trimmedContent}"`,
        }],
      });

      const raw = moderationResponse.content[0].type === "text"
        ? moderationResponse.content[0].text
        : "";
      const parsed = JSON.parse(raw);
      aiDecision = parsed.decision === "block" ? "blocked" : "approved";
      aiReason = parsed.reason ?? null;
      aiScore = typeof parsed.score === "number" ? parsed.score : null;
    } catch (moderationErr) {
      // Fail open: if moderation errors, approve the comment
      console.warn("[submit-comment] Moderation failed, failing open:", moderationErr);
      aiDecision = "approved";
    }

    // ── Insert comment ────────────────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from("comments")
      .insert({
        poll_id,
        user_id: userId,
        content: trimmedContent,
        ai_decision: aiDecision,
        ai_reason: aiReason,
        ai_score: aiScore,
      })
      .select("id, content, created_at")
      .single();

    if (insertError || !inserted) {
      console.error("[submit-comment] Insert failed:", insertError);
      return json({ error: "Failed to save comment" }, 500);
    }

    if (aiDecision === "blocked") {
      return json({ approved: false });
    }

    // ── Mark as commented in Redis (30-day TTL) ───────────────────────────
    redis.set(redisKey, "1", { ex: 60 * 60 * 24 * 30 }).catch(() => {});

    // ── Broadcast via Realtime ────────────────────────────────────────────
    const broadcastPayload = {
      comment: {
        id: inserted.id,
        content: inserted.content,
        created_at: inserted.created_at,
        age_range: userRow?.age_range ?? null,
        region_detail: userRow?.region_detail ?? null,
        political_lean: userRow?.political_lean ?? null,
      },
    };

    const broadcastClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    await broadcastClient
      .channel(`poll:${poll_id}:comments`)
      .send({ type: "broadcast", event: "new_comment", payload: broadcastPayload })
      .catch((e: unknown) => console.warn("[submit-comment] broadcast failed:", e));

    return json({ approved: true, comment: broadcastPayload.comment });
  } catch (err) {
    console.error("[submit-comment]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
