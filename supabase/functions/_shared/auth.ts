import { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Module-level JWT cache — lives in Deno VM memory across warm requests.
// Resets on cold start, so the first request always does a full Supabase verify.
const jwtCache = new Map<string, { userId: string; exp: number }>();

function parseJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded);
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * Verifies a Bearer token against Supabase Auth, with a module-level cache.
 *
 * Cache logic:
 *   - Cold start: always full verify (cache is empty)
 *   - Warm call, token in cache with exp > now+60s: returns instantly (~0ms)
 *   - Token expiring within 60s: forces a fresh verify + re-cache
 *
 * Returns { userId, cached } on success, null on failure.
 */
export async function getAuthenticatedUser(
  token: string,
  supabase: SupabaseClient,
): Promise<{ userId: string; cached: boolean } | null> {
  const nowSec = Date.now() / 1000;
  const entry = jwtCache.get(token);

  if (entry && entry.exp > nowSec + 60) {
    return { userId: entry.userId, cached: true };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const exp = parseJwtExp(token);
  if (exp !== null) {
    jwtCache.set(token, { userId: user.id, exp });
    // Evict expired entries if cache grows large (many distinct users on one VM)
    if (jwtCache.size > 500) {
      for (const [k, v] of jwtCache) {
        if (v.exp <= nowSec) jwtCache.delete(k);
      }
    }
  }

  return { userId: user.id, cached: false };
}
