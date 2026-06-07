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

### ✅ Phase 4 — Feed UI (complete, post-launch fixes applied)

Live feed screen with animated vote bars, optimistic voting, realtime subscriptions,
infinite scroll, skeleton loading, and all DESIGN.md spec met.

### ✅ Phase 5 — Poll Detail (complete, post-launch fixes applied)

Full poll detail screen with demographic breakdown, comment section, Claude-moderated comment input,
flag-comment, and re-enabled card navigation from feed.

Post-launch: vote state sync across screens, poll card info row (votes · voices), zero-vote state,
"View Stats" button on detail screen, Stats screen with demographic ranked bars.

### ✅ Phase 6 — Comments + Moderation (complete)

Full Claude moderation wired (exact SPEC §6.1 prompt), blocked comments never written to DB,
optimistic comment display with fade-out on block, comment ban handling, flag-comment strike system,
migration 007 indexes. Claude moderation disabled for beta (auto-approve all).

### ✅ Performance Pass (complete)

- `components/poll/CommentSection.tsx`: flag button removed; pending card opacity 0.6
- `supabase/functions/feed/index.ts`: timing logs, Cache-Control: no-store, early empty return
- `supabase/functions/poll/index.ts`: 4 sequential DB/Redis layers collapsed to 1 `Promise.all` (10 parallel fetches); removed redundant userVotedFlag if/else; timing logs; Cache-Control header
- `supabase/functions/cast-vote/index.ts`: Redis incr+get+set all in one `Promise.all`; Realtime broadcast fires before DB writes; DB writes are fire-and-forget (non-blocking); timing logs; Cache-Control header
- `supabase/functions/submit-comment/index.ts`: ban check + DB duplicate + Redis duplicate all in parallel `Promise.all`; Realtime broadcast is fire-and-forget; timing logs; Cache-Control header
- `supabase/migrations/008_performance_indexes.sql`: `idx_polls_status_promoted`, `idx_votes_user_polls`, `idx_comments_poll_decision`, `idx_votes_poll_id`

### ✅ Phase 7 — Submit Poll (complete, fixes applied)

Full submit flow: form → toast → form reset. Edge Functions submit-poll + upvote-poll built. Review tab in feed with pending poll cards + upvote buttons. Promotion at 10 upvotes.

Phase 7 fixes (Session 20):
- Removed "Scale 1-5" poll type — only binary and versus
- Category selector replaced with bottom-sheet modal (React Native Modal + FlatList, 11 categories incl. "Other", color dot indicators, "[Category] ▾" selector button)
- Success screen removed — on submit success shows emerald Toast "Your debate is live!" and resets form
- submit-poll auto-approves: status='live', promoted_at=NOW(), expires_at=NOW()+30days, ZADD feed:trending score=10, Realtime broadcast feed:global
- types/database.ts: SubmitPollResponse.status updated to "live" | "pending"

### Not started

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
- `supabase/functions/feed/index.ts` — paginated feed, 5 modes (trending/closest/fresh/for_you/review), Redis+PG counts, user_upvoted for review mode
- `supabase/functions/poll/index.ts` — poll detail, demographics, comments with attribution, has_commented, user_comment, user_demographics
- `supabase/functions/submit-comment/index.ts` — JWT auth, ban check, duplicate check, Claude moderation (claude-sonnet-4-20250514), INSERT, Realtime broadcast
- `supabase/functions/flag-comment/index.ts` — INSERT flag, count flags, auto-block at 3 flags
- `supabase/functions/submit-poll/index.ts` — JWT auth, validation, INSERT polls status='live' (auto-approved), promoted_at+expires_at set, Redis ZADD feed:trending, Realtime broadcast feed:global
- `supabase/functions/upvote-poll/index.ts` — INSERT poll_upvotes, count-based promotion at 10 upvotes, Realtime broadcast on promotion
- `supabase/functions/background-sync/index.ts` — Redis→PG sync, vote queue drain (inactive)

### Components

- `components/onboarding/ProgressBar.tsx`, `OptionGrid.tsx`, `PoliticsSlider.tsx`
- `components/poll/VoteButtons.tsx` — binary + versus types, locked post-vote
- `components/poll/PollCard.tsx` — minimal card (kept for Phase 5 reuse)
- `components/feed/PollCard.tsx` — full feed card: category/status badges, animated vote bar, enter animation, optimistic vote; context override layer for post-vote count sync; info row "votes · voices"; zero-vote gray bar + "Be the first to vote"; card tap → `/poll/[id]`
- `components/poll/DemographicBreakdown.tsx` — fade-in after vote, 4 rows (age/region/politics/gender), mini 4px vote bars, "not enough data" guard (min 5 votes)
- `components/poll/CommentSection.tsx` — "Voices" heading, comment cards with attribution (age_range · region_detail · political lean label), flag button with auto-hide at 3 flags
- `components/poll/CommentInput.tsx` — keyboard-aware bottom input, 150-char limit with counter, optimistic submit, moderation error feedback; locked view shows existing comment with indigo left border
- `components/feed/FeedList.tsx` — FlatList wrapper, viewport tracking, per-poll Realtime subs (max 5)
- `components/feed/FeedModeTabs.tsx` — scrollable mode pill tabs
- `components/feed/PollCardSkeleton.tsx` — shimmer skeleton (opacity loop 0.4→0.8→0.4)
- `components/shared/Toast.tsx` — slide-up toast, auto-dismiss 3s, success/error/info variants
- `components/shared/EmptyState.tsx` — icon + heading + subtext
- `components/shared/VoteCount.tsx` — formatted count with scale-pulse animation + formatVoteCount()

### Libraries / Hooks

- `hooks/useAuth.ts`, `hooks/useOnboarding.ts`
- `hooks/useFeed.ts` — feed state, fetchFeed, loadMore, refresh, switchMode, updatePollCounts
- `hooks/useVote.ts` — optimistic castVote, revert on failure, per-poll vote tracking; persisted to AsyncStorage key `voted_polls`, loaded on mount; `initVote(pollId, value)` hydrates server-known votes without API call
- `hooks/usePollDetail.ts` — poll detail state, realtime comment subscription, updateCounts, addComment
- `lib/supabase.ts` — Supabase client
- `lib/redis.ts` — Upstash Redis client
- `lib/api.ts` — fetchFeed, castVote, fetchPoll, submitComment, flagComment (all auto-attach JWT from supabase.auth.getSession)
- `lib/realtime.ts` — subscribeToFeed, subscribeToPoll, subscribeToPollComments, subscribeToUserPrivate, unsubscribeAll; CommentBroadcast now includes age_range, region_detail, political_lean
- `constants/colors.ts` — full DESIGN.md token system + useColors() hook
- `types/app.ts` — OnboardingData, Poll, PollType
- `types/database.ts` — complete DB types; PollDetailResponse includes has_commented, user_comment, user_demographics, comment_count, full_breakdown; PollWithCounts includes comment_count; DemographicGroup and FullBreakdown interfaces for stats screen
- `contexts/PollStateContext.tsx` — global vote state store (pollId → {yes, no, total, userVote}); PollStateProvider wraps root; usePollState() hook; used by PollCard (override layer) and poll detail screen (write layer)

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
5. PG UPSERT into `votes` (poll_id, user_id, value) — ON CONFLICT DO NOTHING
6. PG UPSERT into `vote_counts` with the Redis-incremented totals
7. Supabase Realtime broadcast to `poll:{poll_id}` channel

Steps 5 and 6 run in parallel via Promise.allSettled — failures are logged but do not fail the response (Redis is already authoritative). Background-sync cron and vote_queue are no longer used.

### Background sync

- **No longer active** — replaced by synchronous PG writes in cast-vote
- Run in Supabase SQL Editor to remove the cron jobs:
  ```sql
  SELECT cron.unschedule('background-sync');
  SELECT cron.unschedule('ranking-update');
  ```
- `supabase/functions/background-sync/index.ts` kept for reference but not called

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

### Tour seen flag

- Stored as `users.has_seen_tour` (BOOLEAN NOT NULL DEFAULT FALSE) — migration 006
- Set to `true` by `exitTour()` in `welcome-tour.tsx` via a direct Supabase update
- Read in `app/index.tsx` routing: `SELECT id, has_seen_tour FROM users WHERE id = $userId`
- Persists across cache clears and reinstalls — never stored in AsyncStorage

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

### Vote persistence

- Voted polls stored in AsyncStorage under key `voted_polls` as a JSON object `{ [pollId]: 1 | -1 }`
- Loaded on `useVote` mount — survives app restarts
- Saved on each confirmed server response (not on optimistic update, to avoid persisting reverted votes)
- A `votesRef` mirrors the state for use inside async callbacks — avoids stale closure without adding `votes` as a dep

### Deprecated packages / APIs — never use

- `crypto.randomUUID()` — not available in React Native; use `Math.random().toString(36).substring(2) + Date.now().toString(36)`
- `uuid` package — use the inline generator above
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

### Session 21 — Fix: New Poll Instant Feed Prepend

- `lib/realtime.ts`: `subscribeToFeed` now listens for both `"feed_delta"` and `"new_poll"` broadcast events on the `feed:global` channel — submit-poll broadcasts `"new_poll"` but the subscription only handled `"feed_delta"`, so new polls never fired the handler
- `lib/api.ts`: added `fetchSinglePoll(pollId)` — calls the `poll` Edge Function, maps `PollDetailResponse` → `PollWithCounts` shape for feed array compatibility
- `hooks/useFeed.ts`: added `prependPoll(poll)` — prepends a single poll to the front of the polls array with dedup guard (skips if id already present)
- `app/(tabs)/index.tsx`: updated `feed:global` subscription handler — when `delta.new` arrives, fetches each poll_id via `fetchSinglePoll` and calls `feed.prependPoll`; falls back to `feed.refresh()` only if fetch fails; no full reload on normal new-poll events

### Session 20 — Phase 7 Fixes: Submit Screen

- `app/(tabs)/submit.tsx`: removed "Scale 1-5" poll type (POLL_TYPES now binary + versus only); removed category grid, replaced with TouchableOpacity selector button + React Native Modal bottom sheet (FlatList of 11 categories incl. "Other", color dot per category, checkmark on selected); removed `submitted` state and success screen branch entirely; removed `router` import; added `toast` state; handleSubmit is fire-and-forget — on success shows emerald Toast "Your debate is live!" + resetForm(), on failure shows rose Toast with error message
- `supabase/functions/submit-poll/index.ts`: added "other" to VALID_CATEGORIES; removed "scale" from VALID_TYPES; INSERT now sets status='live', promoted_at=NOW(), expires_at=NOW()+30days; Redis ZADD to feed:trending with score=10 (was feed:pending score=0); added Realtime broadcast to feed:global channel with {new: [poll_id]}; returns {poll_id, status:'live'}
- `types/database.ts`: SubmitPollResponse.status widened to "live" | "pending"
- Deploy: `supabase functions deploy submit-poll`

### Session 19 — Phase 7: Submit Poll

- `app/(tabs)/submit.tsx`: full rewrite — "Start a Debate" header (Syne 700 24px), DM Sans 13px subtitle, Syne 700 question input, "X / 150" char counter (rose when > 130), 3-way poll type row (Agree/Disagree | Would You Rather | Scale 1-5), category grid with category-specific colors on selected state, 52px Submit button with ActivityIndicator loading state, optimistic success screen (checkmark-circle icon, "Your debate is in review" heading, "Back to Feed" + "Start Another" buttons); fire-and-forget API pattern with revert on failure
- `supabase/functions/submit-poll/index.ts`: JWT auth, validation (question >10 chars ≤150, valid category, option_a/b required for versus ≤50 chars), INSERT polls (status='pending', submitted_by=userId), Redis ZADD feed:pending fire-and-forget; returns {poll_id, status:'pending'}
- `supabase/functions/upvote-poll/index.ts`: JWT auth, verify poll pending, INSERT poll_upvotes (PK conflict → 409), parallel Redis INCR + count DB upvotes, atomic promotion at 10 upvotes (UPDATE WHERE status='pending'), Redis ZADD feed:trending + Realtime broadcast on promotion; returns {upvoted, promoted, upvote_count}
- `supabase/functions/feed/index.ts`: added 'review' mode — queries pending polls by created_at DESC, batches user upvote check (poll_upvotes) in parallel with votes + comment counts, adds user_upvoted to response; fixed pending mode cursor to use created_at not promoted_at
- `hooks/useFeed.ts`: added 'review' to FeedMode, added updatePollUpvote(pollId, count, userUpvoted) for optimistic upvote state
- `components/feed/FeedModeTabs.tsx`: added "In Review" tab
- `components/feed/PollCard.tsx`: added pending card rendering — "In Review" badge, upvote progress bar (indigo fill), "{N} more upvotes to go live" text, thumbs-up button (filled when upvoted, disabled after upvoting); live cards unchanged
- `components/feed/FeedList.tsx`: added onUpvote? prop, passes through to PollCard
- `app/(tabs)/index.tsx`: added handleUpvote — optimistic count increment, API fire-and-forget, refresh feed on promotion, revert on error
- `lib/api.ts`: added submitPoll(), upvotePoll()
- `types/database.ts`: added user_upvoted? to PollWithCounts, SubmitPollResponse, UpvotePollResponse
- `supabase/migrations/009_submit_poll_permissions.sql`: GRANT INSERT/SELECT on polls, poll_upvotes; indexes for pending feed queries
- Deploy: supabase functions deploy submit-poll upvote-poll feed + supabase db push

### Session 18 — Performance Pass

- `components/poll/CommentSection.tsx`: removed flag button and all flag-related code
- `supabase/functions/feed/index.ts`: timing logs, `Cache-Control: no-store`, early return when no poll IDs
- `supabase/functions/poll/index.ts`: 4 sequential round-trip layers collapsed into single `Promise.all` with 10 parallel fetches (poll + profile + votes + comments + myComment + commentCount + userVote + 3 Redis keys); removed redundant userVotedFlag check; timing logs; Cache-Control header
- `supabase/functions/cast-vote/index.ts`: parallel Redis ops (incr voted side + get other + incr total + set voted flag in one `Promise.all`); Realtime broadcast fires immediately before DB; DB writes fire-and-forget; timing logs; Cache-Control header
- `supabase/functions/submit-comment/index.ts`: parallel ban check + DB duplicate + Redis duplicate in one `Promise.all`; Realtime broadcast fire-and-forget; timing logs; Cache-Control header
- `supabase/migrations/008_performance_indexes.sql`: 4 new indexes for feed/poll/vote query patterns
- Deploy: `supabase functions deploy feed poll cast-vote submit-comment` + `supabase db push`

### Session 17 — Comment UX: Optimistic Posting + "Your voice" Card

- `types/database.ts`: added `pending?: boolean` to `PublicComment` — used to track in-flight optimistic comments
- `hooks/usePollDetail.ts`: replaced `addComment` with three focused methods: `addOptimisticComment` (prepend + set `has_commented: true` immediately), `confirmComment` (swap temp ID for real in-place, handles Realtime-first race), `removeComment` (remove failed comment + reset `has_commented: false`)
- `components/poll/CommentInput.tsx`: full rewrite — fires API in background with no await before display; on Post tap the comment appears instantly in the list and input disappears; locked state removed (card now lives in scroll view); no ActivityIndicator or Animated imports needed
- `components/poll/CommentSection.tsx`: pending comments render at `opacity: 0.6`, show "Posting…" instead of attribution, flag button hidden while pending
- `app/poll/[id]/index.tsx`: "Your voice" card (indigo 3px left border, DM Sans 11px label / 13px text) added inside ScrollView above Voices list — visible whenever `data.has_commented`; CommentInput now receives `onOptimisticComment`, `onConfirmComment`, `onRemoveComment` callbacks; removed `handleCommentAdded` and unused `PublicComment` import

### Session 16 — Phase 6: Comments + Moderation

- `supabase/functions/submit-comment/index.ts`: fixed major bug (blocked comments were being inserted to DB — now only approved comments are written); updated to exact SPEC §6.1 moderation prompt; added console.log for comment content, raw Claude response, and parsed decision; moved Redis mark and Realtime broadcast to after successful DB insert
- `supabase/functions/flag-comment/index.ts`: added user_id to comment select; after auto-blocking at 3 flags, counts commenter's total blocked comments and sets `comment_banned = true` if >= 3; changed return from `{ success: true }` to `{ flagged: true, hidden: boolean }`
- `supabase/functions/poll/index.ts`: added `comment_banned` to profile select and response payload
- `types/database.ts`: added `comment_banned: boolean` to `PollDetailResponse`
- `components/shared/Toast.tsx`: added `duration?: number` prop (default 3000ms)
- `components/poll/CommentInput.tsx`: added optimistic pending card (shows "Posting…" while awaiting moderation); on block — fade out optimistic card (300ms Animated), then fire `onBlocked` callback; on network error — restores text for retry; added `onBlocked?` prop for 4s rose toast
- `app/poll/[id]/index.tsx`: fixed broken Toast API (was using `onHide`/no `visible` — now uses correct `visible`/`onDismiss`); toast state upgraded to `{ message, variant, duration? }`; added `showBlocked` callback (4000ms duration); added comment ban check — hides CommentInput, shows "Commenting is unavailable on your account." (DM Sans 12px text-tertiary centered); passes `onBlocked={showBlocked}` to CommentInput
- `supabase/migrations/007_comment_ban_index.sql`: `idx_comment_flags_comment_id`, `idx_comments_user_id`, `idx_comments_ai_decision`
- Deploy: `supabase functions deploy submit-comment flag-comment poll` + `supabase db push`

### Session 15 — Stats Screen Routing & Data Fixes

- `app/poll/[id]/index.tsx` (RENAMED from `app/poll/[id].tsx`): moved to fix Expo Router conflict — `[id].tsx` and `[id]/stats.tsx` cannot coexist; `[id]/` directory now holds `index.tsx`, `stats.tsx`, `_layout.tsx`
- `app/poll/[id]/_layout.tsx` (NEW): simple `<Stack screenOptions={{ headerShown: false }} />` wrapping both poll detail and stats screens
- `app/poll/[id]/stats.tsx`: fixed `useLocalSearchParams` → `useGlobalSearchParams` — `stats` is a static segment so local params are empty; global params include the parent `[id]` segment; removed `MIN_VOTES` threshold entirely (show all groups immediately); removed all debug logging; removed unused `useLocalSearchParams` import
- `supabase/functions/poll` deployed — Session 14 deploy had 403 (project not linked); now deployed with `full_breakdown` and `comment_count` in response
- Navigation: `router.push('/poll/' + poll.id)` → `app/poll/[id]/index.tsx` ✓; `router.push('/poll/' + id + '/stats')` → `app/poll/[id]/stats.tsx` ✓

### Session 14 — Phase 5 Post-Launch Fixes

- `contexts/PollStateContext.tsx` (NEW): global vote state context — `updatePollCounts`, `markPollVoted`, `getPollState`; `PollStateProvider` added to root `_layout.tsx`
- `app/poll/[id].tsx`: removed DemographicBreakdown; integrated PollStateContext (markPollVoted + updatePollCounts on vote); added "View Stats" button (only when voted, navigates to `/poll/[id]/stats`); zero-vote state (gray bar + "Be the first to vote"); count row shows "votes · voices"; `comment_count` from API
- `app/poll/[id]/index.tsx` (was `[id].tsx`): poll detail screen — moved into `[id]/` directory to support nested stats route
- `app/poll/[id]/stats.tsx` (NEW): Stats screen — header (back + "Stats" + question subtitle), 2×2 summary grid (total votes, total voices, agree %, disagree %), demographic tabs (Age/Politics/Region/Gender), ranked group bars with animated fills, user's own group highlighted in indigo left border, no vote threshold (all groups shown)
- `components/feed/PollCard.tsx`: context override layer (PollStateContext) for post-vote count sync on back navigation; info row "12.4k votes · chatbubble-outline · 847 voices" using formatVoteCount; zero-vote solid gray bar + "Be the first to vote"; removed VoteCount component import
- `supabase/functions/feed/index.ts`: added `comment_count` to response via batched Promise.all query (approved comments only)
- `supabase/functions/poll/index.ts`: added `full_breakdown` (sorted arrays with raw yes/no/total/yes_pct per group, region top 10); added `comment_count` (approved only); `buildDemographicBreakdown` now returns both `demographic_breakdown` (compact) and `full_breakdown` (sorted arrays)
- `types/database.ts`: added `DemographicGroup`, `FullBreakdown` interfaces; `comment_count` to `PollWithCounts`; `comment_count` and `full_breakdown` to `PollDetailResponse`
- All UI labels "Comments" → "Voices" (DB/API fields unchanged as `comment_count`)
- Deploy: `supabase functions deploy feed poll` (requires `supabase link --project-ref <ref>` first)

### Session 13 — Phase 5: Poll Detail Screen

- `app/poll/[id].tsx`: full detail screen — back button, category badge, Syne 700 22px question, 10px spring-animated vote bar, percentage row, majority/minority text, VoteButtons, DemographicBreakdown (fade-in after vote), CommentSection, CommentInput pinned at bottom, skeleton loading, error state, KeyboardAvoidingView
- `components/poll/DemographicBreakdown.tsx`: fade-in (400ms) after vote, 4 rows (age/region/politics/gender), each shows user's own group from user_demographics; mini 4px vote bars; "Not enough data" if group < 5 votes
- `components/poll/CommentSection.tsx`: "Voices" heading, CommentCard with content + attribution (age_range · region_detail · political lean) + flag button; flag calls flag-comment Edge Function; auto-hides at 3 flags
- `components/poll/CommentInput.tsx`: 150-char limit with countdown, Post button, loading state, keyboard-safe via useSafeAreaInsets; shows locked card (indigo left border) if user has already commented; moderation-blocked comments get a toast error
- `hooks/usePollDetail.ts`: loads poll via fetchPoll, subscribes to poll:comments Realtime channel, exposes updateCounts/addComment callbacks
- `supabase/functions/poll/index.ts`: fetches user profile alongside poll; returns user_demographics, has_commented, user_comment, comment_count (approved only), demographic_breakdown (keyed compact form), full_breakdown (sorted arrays with raw yes/no/total per group, region capped at 10, all groups filtered to ≥5 votes on client)
- `supabase/functions/submit-comment/index.ts`: full implementation — JWT auth, comment_banned check, DB + Redis duplicate guard, poll question fetch, Claude moderation (claude-sonnet-4-20250514, fail-open), INSERT comment, Redis TTL flag, Realtime broadcast with attribution fields
- `supabase/functions/flag-comment/index.ts`: full implementation — JWT auth, comment existence check, INSERT flag (ignore duplicate 23505), count flags, auto-block comment at 3 flags
- `lib/api.ts`: fixed fetchPoll bug (replaced non-existent authHeaders() with getToken()); added submitComment(pollId, content), flagComment(commentId)
- `lib/realtime.ts`: updated CommentBroadcast type — comment now includes region_detail and political_lean for client-side attribution display
- `types/database.ts`: expanded PublicComment with age_range, region_detail, political_lean; added UserDemographics interface; updated PollDetailResponse with has_commented, user_comment, user_demographics, fixed user_vote type to 1 | -1 | null
- `components/feed/PollCard.tsx`: re-enabled navigation — outer View replaced with TouchableOpacity + router.push('/poll/' + poll.id)
- Deploy: `supabase functions deploy submit-comment flag-comment poll`

### Session 12 — Tour Flag Moved to PostgreSQL

- `supabase/migrations/006_user_tour_flag.sql`: `ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN NOT NULL DEFAULT FALSE`
- `app/index.tsx`: removed `AsyncStorage.clear()` debug line and all AsyncStorage/TOUR_FLAG usage; select now includes `has_seen_tour`; routing reads from DB field directly
- `app/(auth)/onboarding/welcome-tour.tsx`: removed `TOUR_FLAG` export and `AsyncStorage` import; `exitTour()` now calls `supabase.from('users').update({ has_seen_tour: true })` then routes to tabs
- `app/(auth)/onboarding/complete.tsx`: removed `AsyncStorage` and `TOUR_FLAG` imports; duplicate-key branch now queries `has_seen_tour` from DB instead of AsyncStorage
- `app/(tabs)/board.tsx`: removed `AsyncStorage.removeItem(TOUR_FLAG)` from sign-out (flag lives in DB now, persists correctly across sessions)
- `types/database.ts`: added `has_seen_tour: boolean` to `DbUser`
- Deploy: `supabase db push` to apply migration 006

### Session 11 — Synchronous PG Writes in cast-vote

- `supabase/functions/cast-vote/index.ts`: removed vote_queue LPUSH; added synchronous PG writes for `votes` and `vote_counts` tables using Promise.allSettled (best-effort — Redis already committed, PG failures are logged but don't fail the response)
- Architecture change: vote_counts is now a near-real-time PG mirror updated on every vote rather than a periodic snapshot; background-sync cron is no longer needed
- Cron jobs to unschedule in Supabase SQL Editor: `SELECT cron.unschedule('background-sync');` and `SELECT cron.unschedule('ranking-update');`
- Deploy command: `supabase functions deploy cast-vote`

### Session 10 — Voted State Hydration from Server

- `supabase/functions/feed/index.ts`: after slicing the page polls, runs one batch PG query (`SELECT poll_id, value FROM votes WHERE user_id = $id AND poll_id IN (...)`) to get the user's vote directions for this page; attaches `user_vote: 1 | -1 | null` to every poll in the response (both Redis-hit and vote_counts-fallback paths)
- `types/database.ts`: added `user_vote: 1 | -1 | null` to `PollWithCounts` and to the local `PollWithCounts` interface in the feed function
- `hooks/useVote.ts`: added `initVote(pollId, value)` — hydrates a known vote into the map + AsyncStorage without calling the API; idempotent (skips if already known)
- `app/(tabs)/index.tsx`: added `useEffect` on `feed.polls` that calls `initVote` for every poll with a non-null `user_vote`; runs on initial load, refresh, and load-more
- Note: Redis voted key (`user:{id}:voted:{poll_id}`) stores only `"1"` (a boolean flag), not the vote direction — the votes table is the authoritative source for the actual value

### Session 9 — Phase 4 Post-Launch Fixes

- Removed all emoji from UI — status badges (Trending/Hot/Fresh/Closing) now use Ionicons (flame-outline / flash-outline / sparkles-outline / time-outline) with icon + label side by side
- Disabled poll card tap navigation to prevent Phase 5 crash; TODO comment marks where to re-enable
- Fixed pull-to-refresh on empty and skeleton states — wrapped both in ScrollView with RefreshControl
- Added debug logging to lib/api.ts (JWT, URL, response body) and hooks/useFeed.ts (errors, poll count)
- Fixed feed Edge Function: Redis errors now caught per-poll (fallback to vote_counts table); added server-side logging; added for_you to FeedMode type
- Vote persistence: hooks/useVote.ts now loads voted state from AsyncStorage on mount and saves on each confirmed vote; uses a ref to avoid stale closure in async callbacks

### Session 8 — Phase 4: Feed UI

- `lib/api.ts`: fetchFeed, castVote, fetchPoll — all auto-attach JWT via supabase.auth.getSession()
- `hooks/useFeed.ts`: feed state management — mode, polls, loading, pagination, realtime count updates
- `hooks/useVote.ts`: optimistic vote with revert on failure, per-poll voted state
- `components/feed/PollCard.tsx`: full card per DESIGN.md — category/status badges, animated spring vote bar, enter animation staggered by index
- `components/feed/FeedList.tsx`: FlatList with viewability tracking, max 5 active poll Realtime subs
- `components/feed/FeedModeTabs.tsx`: scrollable pill tabs (Trending / Closest / Fresh / For You)
- `components/feed/PollCardSkeleton.tsx`: shimmer skeleton matching PollCard layout
- `components/shared/Toast.tsx`: slide-up toast, 3s auto-dismiss, success/error/info
- `components/shared/EmptyState.tsx`: icon + Syne heading + DM Sans subtext
- `components/shared/VoteCount.tsx`: formatted count with scale-pulse on change
- `app/(tabs)/index.tsx`: full feed screen — header, mode tabs, FeedList, feed:global Realtime, Toast
- `supabase/functions/feed/index.ts`: added velocity field to response (fetched from Redis poll:{id}:velocity)
- `types/database.ts`: added optional velocity to PollWithCounts
