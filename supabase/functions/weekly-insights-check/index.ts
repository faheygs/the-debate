import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!authHeader || authHeader.replace("Bearer ", "") !== serviceKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  const start = Date.now();

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  try {
    // Users who joined 7+ days ago and either have never had insights or are due
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: usersNeverGenerated } = await supabase
      .from("users")
      .select("id")
      .lt("created_at", sevenDaysAgo)
      .not("id", "in",
        supabase.from("user_insights").select("user_id")
      );

    const { data: usersDue } = await supabase
      .from("user_insights")
      .select("user_id")
      .lt("last_generated_at", sevenDaysAgo);

    const neverIds = (usersNeverGenerated ?? []).map((u: { id: string }) => u.id);
    const dueIds = (usersDue ?? []).map((u: { user_id: string }) => u.user_id);
    const allIds = [...new Set([...neverIds, ...dueIds])];

    console.log(`[weekly-insights-check] ${allIds.length} users to process (${neverIds.length} never, ${dueIds.length} due)`);

    const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-insights`;
    let succeeded = 0;
    let failed = 0;

    // Process in batches of 5 to avoid overwhelming Claude API
    for (let i = 0; i < allIds.length; i += 5) {
      const batch = allIds.slice(i, i + 5);
      await Promise.allSettled(
        batch.map(userId =>
          fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ userId }),
          })
            .then(res => {
              if (res.ok) succeeded++;
              else failed++;
            })
            .catch(() => { failed++; })
        )
      );
    }

    console.log(`[weekly-insights-check] done in ${Date.now() - start}ms — succeeded=${succeeded} failed=${failed}`);
    return json({ processed: allIds.length, succeeded, failed });
  } catch (err) {
    console.error("[weekly-insights-check]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
