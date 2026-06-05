# CONTEXT.md — The Debate

> Read this file alongside SPEC.md and DESIGN.md at the start of every session.
> This is the living progress log. Update it at the end of every session.

---

## What This App Is

Anonymous polling and debate platform. Users vote agree/disagree on any topic,
see real-time results broken down by demographics, and get AI-generated insights
about their own worldview. No usernames, no social graph, one comment per poll.
Full details in SPEC.md.

---

## Tech Stack

- Expo SDK 56 / Expo Router / TypeScript / React Native
- Supabase (Postgres + Auth + Realtime + Edge Functions)
- Upstash Redis (hot vote counts, feed ranking)
- Claude API / Anthropic (comment moderation, worldview insights)
- EAS for builds

## Key Files

- SPEC.md — full technical specification
- DESIGN.md — full design system, colors, typography, animations
- CONTEXT.md — this file, progress tracking

---

## Current Status

### ✅ Phase 1 — Foundation (complete)

Expo SDK 56 project, folder structure, Supabase schema, all migrations, lib setup.

### ✅ Phase 2 — Auth, Onboarding & Pre-launch UX (complete)

Email/password auth, 7-step onboarding, versus poll type, welcome tour,
routing fixes, font loading, colour system, submit screen form, sign out.

### ✅ Phase 3 — Core Poll Loop (complete)

Edge Functions built, Redis vote pipeline wired, Realtime broadcasting, 50 seed polls,
database permissions migration, Realtime helper, full database types.

### 🔜 Phase 4 — Feed UI (next up)

Build the live feed screen. Phase 3 backend is ready to power it.

What Phase 4 covers (from SPEC.md section 16):
- FeedScreen + FeedList with FlatList and viewport tracking
- PollCard component with animated vote bar (DESIGN.md spec)
- Optimistic vote UI — bar animates immediately on tap
- Realtime subscription hook (feed:global + poll:id channels)
- Feed mode tabs (trending / fresh / closest)
- Infinite scroll with cursor pagination

### Not started

- [ ] Phase 5 — Poll Detail
- [ ] Phase 6 — Comments + Moderation
- [ ] Phase 7 — Submit Poll (form UI exists; edge function not built)
- [ ] Phase 8 — Personal Board (sign out button is placeholder)
- [ ] Phase 9 — Search
- [ ] Phase 10 — Polish + Push Notifications

---

## What's Actually Built

### App shell

- `app/_layout.tsx` — root Stack, AuthContext, font loading (Syne + DM Sans), SplashScreen
- `app/index.tsx` — launch router: getSession → users row → tour flag → redirect
- `app/(auth)/_layout.tsx` — simple Stack for auth screens
- `app/(tabs)/_layout.tsx` — 4-tab navigator, redirects to auth if no session

### Auth

- `app/(auth)/auth.tsx` — email + password sign in / sign up, single screen with toggle

### Onboarding (7 steps + tour)

- `app/(auth)/onboarding/_layout.tsx` — Stack + OnboardingContext
- age / gender / region / politics / income / education / complete / welcome-tour

### Tab screens

- `app/(tabs)/index.tsx` — Feed placeholder (Phase 4)
- `app/(tabs)/search.tsx` — Search placeholder (Phase 9)
- `app/(tabs)/submit.tsx` — full form: question, poll type, versus inputs, category
- `app/(tabs)/board.tsx` — Personal Board placeholder + temporary Sign Out

### Edge Functions (Deno, npm: imports)

- `supabase/functions/cast-vote/index.ts` — full vote pipeline per SPEC §4
- `supabase/functions/feed/index.ts` — paginated feed, 4 modes, Redis+PG counts
- `supabase/functions/poll/index.ts` — full poll detail, demographics, comments
- `supabase/functions/background-sync/index.ts` — Redis→PG sync, vote queue drain

### Components

- `components/onboarding/ProgressBar.tsx`, `OptionGrid.tsx`, `PoliticsSlider.tsx`
- `components/poll/VoteButtons.tsx` — binary + versus types, locked post-vote
- `components/poll/PollCard.tsx` — minimal card (Phase 4 will fully build this out)

### Libraries / Hooks

- `hooks/useAuth.ts`, `hooks/useOnboarding.ts`
- `lib/supabase.ts` — Supabase client
- `lib/redis.ts` — Upstash Redis client
- `lib/realtime.ts` — subscribeToFeed, subscribeToPoll, subscribeToPollComments, subscribeToUserPrivate, unsubscribeAll
- `constants/colors.ts` — full DESIGN.md token system + useColors() hook
- `types/app.ts` — OnboardingData, Poll, PollType
- `types/database.ts` — complete DB types: DbUser, DbPoll, DbVote, DbVoteCount, DbComment, PollDetailResponse, FeedResponse, etc.

### Database

- Migrations 001–005 (005 = API permissions + pg_cron instructions)
- Seed: `supabase/seed/seed_polls.sql` — 50 polls, all live, 30-day expiry for non-evergreen, NULL expiry for evergreen hypotheticals

---

## Decisions Made

### Auth approach

- Email + password only (no phone/SMS/Twilio)
- Email confirmation disabled — sessions granted immediately
- `users.phone_hash` stores `email:{userId}` as a legacy placeholder

### Database permissions — migration 005

- Migration 005 grants all required table permissions to `authenticated` role
- Also grants `vote_counts` and `votes` write access to `service_role` (Edge Functions)
- pg_cron job SQL is in migration 005 as comments — must be run manually with real project URL + service key
- Previous manual grant (session 4) is now superseded by migration 005

### Versus poll type

- `poll_type = 'versus'` uses `option_a` / `option_b` columns for custom labels
- 4 "Would you rather" polls in the seed data use versus type
- All other 46 seed polls use binary type

### Seed polls

- 50 polls across politics, culture, ethics, relationships, hypothetical
- All status = 'live' with promoted_at = NOW()
- Non-evergreen: expires_at = NOW() + 30 days (not 48h — seed data needs to stay live during development)
- Hypothetical 10: is_evergreen = true, expires_at = NULL (timeless questions, resurface forever)
- Versus polls in seed: "Would you rather know when you die or how you die?", "Would you rather be the smartest or the happiest?", "Would you rather have more money or more time?", "Guaranteed $1M or chance at $100M?"

### Edge Function architecture

- All functions use Deno with `npm:` imports (`npm:@supabase/supabase-js@2`, `npm:@upstash/redis`)
- Auth: `supabase.auth.getUser(token)` with the service role client
- Environment variables: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` auto-injected by Supabase; `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set as Supabase secrets

### Vote pipeline (cast-vote)

1. Auth check → 401 if missing/invalid
2. Redis duplicate check (`user:{id}:voted:{poll_id}`) → 409 if already voted
3. Redis INCR the appropriate counter (yes or no) + INCR total
4. Redis SET voted flag with 30-day TTL
5. Redis LPUSH to `poll:{id}:vote_queue` (for background-sync to drain into PostgreSQL)
6. Supabase Realtime broadcast to `poll:{poll_id}` channel

### Background sync

- Triggered by pg_cron every 10 seconds (see migration 005 for setup SQL)
- Reads all live poll IDs from PostgreSQL
- For each: UPSERTs Redis counts into vote_counts table
- Drains `poll:{id}:vote_queue` list: LRANGE + LTRIM, then batch INSERT into votes with ON CONFLICT DO NOTHING

### Feed function

- Mode `fresh` and `trending` both order by `promoted_at DESC` in Phase 3
- Redis ranking (sorted sets) added in Phase 4 for true trending scores
- `closest` mode: fetches by promoted_at, then re-sorts client-side by controversy score after count enrichment
- Cursor is base64-encoded `promoted_at` timestamp
- Each poll enriched with Redis counts; falls back to vote_counts table if Redis miss

### Realtime

- `lib/realtime.ts` manages a channel registry (Map<string, RealtimeChannel>)
- Returns unsubscribe functions — callers responsible for cleanup on unmount
- Channels: `feed:global`, `poll:{id}`, `poll:{id}:comments`, `user:{id}:private`
- Enable Realtime on `vote_counts` table in Supabase dashboard → Database → Replication

### Routing fix — getSession() not onAuthStateChange()

- `_layout.tsx` calls getSession() first; onAuthStateChange skips INITIAL_SESSION
- `index.tsx` calls getSession() directly, checks users table, checks tour flag
- Routing order: no session → auth | session+no row → onboarding | session+row+no flag → tour | session+row+flag → tabs

### Fonts

- `Syne_700Bold`, `DMSans_400Regular`, `DMSans_500Medium` loaded in `_layout.tsx`
- SplashScreen hides once fonts load (non-blocking on font error)

### Design system

- Primary: Indigo `#6366F1` | Agree: Emerald `#10B981` | Disagree: Rose `#F43F5E`
- Full token system in `constants/colors.ts` — always use `useColors()`, never hardcode hex

### Deprecated packages — never use

- `uuid` below v11 — use `crypto.randomUUID()`
- `lodash.get` — use optional chaining `?.`

---

## How to Resume a Session

```
"Read CONTEXT.md, SPEC.md, and DESIGN.md before doing anything.
[describe what you want to work on]"
```

---

## Session Log

### Session 1 — Phase 1: Foundation

- Initialized Expo SDK 56 + Expo Router + TypeScript
- Supabase schema migrations 001 (tables), 002 (RLS), 003 (indexes)
- `lib/supabase.ts`, `lib/redis.ts`, `.env.example`, folder structure

### Session 2 — Phase 2: Auth & Onboarding

- Email/password auth screen, 7-step onboarding with OnboardingContext
- Root layout + AuthContext, placeholder tab screens
- `hooks/useAuth.ts`, `hooks/useOnboarding.ts`, onboarding components

### Session 3 — Phase 2 Bug Fixes Round 1

- "Prefer not to say" on all onboarding steps; Skip on region + politics
- Versus poll type: migration 004 (option_a/option_b), VoteButtons.tsx
- Full submit screen form; `constants/colors.ts` from DESIGN.md

### Session 4 — Phase 2 Bug Fixes Round 2

- Permission fix: manual SQL grant in Supabase
- Routing race condition fixed (getSession + INITIAL_SESSION skip)
- Versus seed polls fixed; SeedPollCard uses VoteButtons

### Session 5 — Welcome Tour

- Google Fonts installed; `_layout.tsx` loads fonts + SplashScreen
- `welcome-tour.tsx`: 5-slide FlatList, DESIGN.md compliant
- `complete.tsx` → tour → tabs flow; AsyncStorage tour flag

### Session 6 — Temporary Sign Out + Phase 2 Wrap

- Temporary Sign Out button in board.tsx (Phase 8 replaces)
- Phase 2 fully complete

### Session 7 — Phase 3: Core Poll Loop

- `supabase/seed/seed_polls.sql`: 50 polls seeded (46 binary, 4 versus, 10 evergreen)
- `supabase/migrations/005_api_permissions.sql`: table grants + pg_cron instructions
- `supabase/functions/cast-vote/index.ts`: full Redis vote pipeline + Realtime broadcast
- `supabase/functions/feed/index.ts`: 4 modes, cursor pagination, Redis+PG count enrichment
- `supabase/functions/poll/index.ts`: full poll detail, demographic breakdown, comments
- `supabase/functions/background-sync/index.ts`: Redis→vote_counts UPSERT + vote queue drain
- `lib/realtime.ts`: channel helpers for feed, poll, comments, user private channels
- `types/database.ts`: complete TypeScript types for all tables + Edge Function response shapes
