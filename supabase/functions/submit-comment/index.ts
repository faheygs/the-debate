import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMENT_TTL = 60 * 60 * 24 * 30; // 30 days

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const start = Date.now();

  try {
    // ── Auth (JWT cache) ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authResult = await getAuthenticatedUser(
      authHeader.replace("Bearer ", ""),
      supabase,
    );
    if (!authResult) return json({ error: "Unauthorized" }, 401);
    const userId = authResult.userId;

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

    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    const redisKey = `user:${userId}:commented:${poll_id}`;

    // ── Parallel: ban check + DB duplicate + Redis duplicate ──────────────
    const [userRow, existingComment, alreadyCommentedRedis] = await Promise.all([
      supabase
        .from("users")
        .select("comment_banned, age_range, region_detail, political_lean")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => data),
      supabase
        .from("comments")
        .select("id")
        .eq("poll_id", poll_id)
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => data),
      redis.get(redisKey).catch(() => null),
    ]);

    console.log(`[submit-comment] checks done in ${Date.now() - start}ms`);

    if (userRow?.comment_banned) {
      return json({ error: "You have been banned from commenting" }, 403);
    }
    if (existingComment || alreadyCommentedRedis) {
      return json({ error: "You have already commented on this poll" }, 409);
    }

    // ── Fetch poll question for moderation context ───────────────────────
    const { data: pollData } = await supabase
      .from("polls")
      .select("question")
      .eq("id", poll_id)
      .single();
    const pollQuestion = pollData?.question ?? "Unknown topic";

    // ── Claude moderation ─────────────────────────────────────────────────
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("[submit-comment] API key exists:", !!ANTHROPIC_API_KEY);
    console.log("[submit-comment] API key prefix:", ANTHROPIC_API_KEY?.substring(0, 10));

    let aiDecision: "approved" | "blocked" = "approved";
    let aiReason: string | null = null;
    let aiScore = 0;

    if (!ANTHROPIC_API_KEY) {
      console.error("[submit-comment] ANTHROPIC_API_KEY not set — approving without moderation");
    } else {
      try {
        const moderationResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 200,
            system: `You moderate opinions on an anonymous debate platform.
Your job is simple: block genuinely harmful content, approve everything else.
The bar for blocking is HIGH. Default to approving.

BLOCK if the opinion contains ANY of:
- Racial, ethnic, sexual, or religious slurs of any kind
- Direct personal attacks ("fuck you", "you're an idiot", targeted insults)
- Threats of violence against any person or group
- Spam: identical repeated text, promotional links, gibberish, random characters
- Fewer than 5 meaningful words that add no substance
- Content completely unrelated to the debate topic

APPROVE everything else including:
- Strong opinions, even offensive or controversial ones
- Profanity that isn't a targeted personal attack ("this is bullshit" = approve)
- Short but substantive opinions
- Unpopular or minority viewpoints
- Emotional or heated language about the TOPIC not a person

Respond ONLY with valid JSON, no other text:
{ "decision": "approve" | "block", "reason": "one sentence if blocking, null if approving", "score": 0.0-1.0 }`,
            messages: [{
              role: "user",
              content: `Debate topic: "${pollQuestion}"\n\nOpinion to moderate: "${trimmedContent}"`,
            }],
          }),
        });

        const moderationData = await moderationResponse.json();
        const moderationText = moderationData.content?.[0]?.text ?? "";

        try {
          const parsed = JSON.parse(moderationText);
          aiDecision = parsed.decision === "block" ? "blocked" : "approved";
          aiReason = parsed.reason ?? null;
          aiScore = parsed.score ?? 0;
        } catch {
          console.warn("[submit-comment] Failed to parse Claude response, approving:", moderationText);
        }
      } catch (err) {
        console.warn("[submit-comment] Claude call failed, approving:", err);
      }
    }

    console.log("[submit-comment] Claude decision:", aiDecision, "score:", aiScore);

    if (aiDecision === "blocked") {
      return json({ approved: false, blocked: true, reason: aiReason }, 200);
    }

    // ── Insert approved comment ───────────────────────────────────────────
    const insertPayload = {
      poll_id,
      user_id: userId,
      content: trimmedContent,
      ai_decision: aiDecision,
      ai_reason: aiReason,
      ai_score: aiScore,
    };
    console.log("[submit-comment] Inserting comment:", JSON.stringify(insertPayload));

    const { data: inserted, error: insertError } = await supabase
      .from("comments")
      .insert(insertPayload)
      .select("id, content, created_at")
      .single();

    if (insertError || !inserted) {
      console.error("[submit-comment] Insert failed — full error:", JSON.stringify(insertError));
      console.error("[submit-comment] Insert failed — code:", insertError?.code, "message:", insertError?.message, "details:", insertError?.details, "hint:", insertError?.hint);
      return json({ error: insertError?.message ?? "Failed to save comment", code: insertError?.code }, 500);
    }

    console.log(`[submit-comment] insert done in ${Date.now() - start}ms`);

    // ── Mark as commented in Redis (fire-and-forget) ──────────────────────
    redis.set(redisKey, "1", { ex: COMMENT_TTL }).catch(() => {});

    // ── Broadcast via Realtime (fire-and-forget) ──────────────────────────
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
    broadcastClient
      .channel(`poll:${poll_id}:comments`)
      .send({ type: "broadcast", event: "new_comment", payload: broadcastPayload })
      .catch((e: unknown) => console.warn("[submit-comment] broadcast failed:", e));

    console.log(`[submit-comment] done in ${Date.now() - start}ms`);

    return json({ approved: true, comment: broadcastPayload.comment });
  } catch (err) {
    console.error("[submit-comment]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
