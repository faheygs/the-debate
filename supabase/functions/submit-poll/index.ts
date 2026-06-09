import { createClient } from "npm:@supabase/supabase-js@2";
import { Redis } from "npm:@upstash/redis";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CATEGORIES = new Set([
  "politics", "culture", "food", "ethics", "sports",
  "tech", "relationships", "hypothetical", "news", "entertainment", "other",
]);
const VALID_TYPES = new Set(["binary", "versus"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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
    const body = await req.json();
    const { question, category, poll_type = "binary", option_a, option_b, tags } = body;

    if (!question || typeof question !== "string" || question.trim().length < 10) {
      return json({ error: "Question must be at least 10 characters" }, 400);
    }
    if (question.trim().length > 150) {
      return json({ error: "Question too long (max 150 characters)" }, 400);
    }
    if (!category || !VALID_CATEGORIES.has(category)) {
      return json({ error: "Invalid or missing category" }, 400);
    }
    if (!VALID_TYPES.has(poll_type)) {
      return json({ error: "Invalid poll type" }, 400);
    }
    if (poll_type === "versus") {
      if (!option_a || typeof option_a !== "string" || option_a.trim().length === 0) {
        return json({ error: "Option A required for versus polls" }, 400);
      }
      if (!option_b || typeof option_b !== "string" || option_b.trim().length === 0) {
        return json({ error: "Option B required for versus polls" }, 400);
      }
      if (option_a.trim().length > 50 || option_b.trim().length > 50) {
        return json({ error: "Options max 50 characters each" }, 400);
      }
    }

    const trimmedQuestion = question.trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── INSERT poll ───────────────────────────────────────────────────────
    const insertPayload: Record<string, unknown> = {
      question: trimmedQuestion,
      category,
      poll_type,
      submitted_by: userId,
      status: "live",
      promoted_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };
    if (poll_type === "versus") {
      insertPayload.option_a = option_a.trim();
      insertPayload.option_b = option_b.trim();
    }

    const { data: inserted, error: insertError } = await supabase
      .from("polls")
      .insert(insertPayload)
      .select("id, status")
      .single();

    if (insertError || !inserted) {
      console.error("[submit-poll] Insert failed:", JSON.stringify(insertError));
      return json({ error: insertError?.message ?? "Failed to create poll" }, 500);
    }

    console.log(`[submit-poll] inserted ${inserted.id} in ${Date.now() - start}ms`);

    // ── Tags (fire-and-forget) ────────────────────────────────────────────
    if (Array.isArray(tags) && tags.length > 0) {
      const tagInserts = (tags as unknown[])
        .slice(0, 5)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .map(t => ({ poll_id: inserted.id, tag: t.toLowerCase().slice(0, 50) }));

      if (tagInserts.length > 0) {
        supabase.from("poll_tags").insert(tagInserts).then(() => {}).catch((e: unknown) =>
          console.warn("[submit-poll] tag insert failed:", e)
        );
      }
    }

    // ── Poll Promoted notification (fire-and-forget) ─────────────────────
    supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data: submitter }) => {
        const token = submitter?.expo_push_token;
        if (!token) return;
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ token, title: 'Your debate is live', body: 'People are voting on it now', data: { type: 'poll_promoted', poll_id: inserted.id } }),
        });
      })
      .catch(() => {});

    // ── Redis + Realtime (fire-and-forget) ────────────────────────────────
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    redis.zadd("feed:trending", { score: 10, member: inserted.id }).catch((e: unknown) =>
      console.warn("[submit-poll] Redis zadd failed:", e)
    );

    supabase.channel("feed:global").send({
      type: "broadcast",
      event: "new_poll",
      payload: { new: [inserted.id] },
    }).catch((e: unknown) =>
      console.warn("[submit-poll] Realtime broadcast failed:", e)
    );

    console.log(`[submit-poll] done in ${Date.now() - start}ms`);

    return json({ poll_id: inserted.id, status: "live" });
  } catch (err) {
    console.error("[submit-poll]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
