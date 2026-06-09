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
- TanStack Query v5 — all data fetching, stale-while-revalidate, user-scoped cache keys, AsyncStorage persistence (24h, success-only, per-user key `tq-cache-${userId}`)
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

### ✅ Feed Performance Optimisations — Pass 2 (complete)

**JWT cache — eliminates 400–500ms auth overhead on warm calls:**
- `supabase/functions/_shared/auth.ts` (NEW): module-level `jwtCache: Map<token, {userId, exp}>`. Cold start always does a full `supabase.auth.getUser()` verify; warm calls (same Deno VM instance) skip the network round-trip and return in ~0ms. Evicts tokens expiring within 60s and auto-purges expired entries when cache exceeds 500 entries.
- All 7 Edge Functions updated to import and use `getAuthenticatedUser()` from the shared helper: `feed`, `cast-vote`, `poll`, `submit-comment`, `submit-poll`, `personal-board`, `search`.
- `feed/index.ts` logs `(cache hit)` or `(cold)` on the auth timing line.

**Redis warmup — eliminates DB fallback on every feed load:**
- `feed/index.ts`: when a DB fallback fires for Redis-missing polls, writes the fetched counts back to Redis as a fire-and-forget pipeline. Next request for the same polls hits Redis instead of Postgres.
- `search/index.ts`: same write-back pattern added to `enrichPolls()`.
- `supabase/functions/warm-redis/index.ts` (NEW): one-time utility that reads all `vote_counts` rows and bulk-writes yes/no/total to Redis in 300-poll pipeline batches. Call once after seeding or after Redis is cleared: `curl -X POST .../warm-redis -H "Authorization: Bearer <jwt>"`.

**Granular feed timing (from previous pass):**
- `feed/index.ts` emits per-stage logs: `auth`, `poll query`, `redis pipeline`, `vote query`, `comment counts`, `full batch`, `db fallback (N misses)`, `done`.

**Targets:** auth ~0ms on warm calls (was 400–500ms); trending feed <400ms warm (was 614–1695ms); Redis misses → 0 after first warm-up request.

### ✅ Phase 7 — Submit Poll (complete, fixes applied)

Full submit flow: form → toast → form reset. Edge Functions submit-poll + upvote-poll built. Review tab in feed with pending poll cards + upvote buttons. Promotion at 10 upvotes.

Phase 7 fixes (Session 20):
- Removed "Scale 1-5" poll type — only binary and versus
- Category selector replaced with bottom-sheet modal (React Native Modal + FlatList, 11 categories incl. "Other", color dot indicators, "[Category] ▾" selector button)
- Success screen removed — on submit success shows emerald Toast "Your debate is live!" and resets form
- submit-poll auto-approves: status='live', promoted_at=NOW(), expires_at=NOW()+30days, ZADD feed:trending score=10, Realtime broadcast feed:global
- types/database.ts: SubmitPollResponse.status updated to "live" | "pending"

### ✅ Phase 8 — Personal Board (complete)

Full personal board with worldview summary, 2×2 stat grid, and voting history list. Auto-generates Claude insights when ≥5 votes and stale (10+ new votes since last generation). Sign out demoted to subtle text link at bottom.

### ✅ Phase 10 — Error & Empty States (complete)

Comprehensive error and empty state pass across all screens. Every API failure shows a consistent EmptyState. Skeleton loading used throughout — no full-page spinners.

### ✅ Phase 9 — Explore Screen (complete, post-launch fixes applied)

Full Explore screen replacing the search.tsx placeholder. 3 states: Default Explore (trending/contested/closing soon/category grid/fresh), Search Active, Category View. search Edge Function with FTS + ILIKE category/option expansion + closing sort. PollCardCompact component for horizontal scroll rows. useExplore and useSearch hooks. Tab renamed to "Explore" with compass icon.

Post-launch: expanded search to cover category + option_a/option_b via parallel FTS+ILIKE queries (merged FTS-first); added ?sort=closing endpoint; added "Closing Soon" section to Explore; time-remaining indicator on closing cards; cast-vote enforces expires_at; lib/utils.ts with formatTimeRemaining/formatVoteCount/formatAttribution.

### ✅ Phase 11 — VoteBar Redesign + UX Overhaul (complete, Session 30)

Eight major UX and feature changes implemented:

1. **Diagonal SVG VoteBar** (`components/poll/VoteBar.tsx`) — 44px tall, border-radius 10px, parallelogram split: amber for your side, slate-blue (#2A3440 dark / #D4DDE6 light) for the other. Diagonal slash with 18px lean. Percentage labels float inside bar. Before voting: neutral `colors.border` bar with "Cast your vote to see results". Spring animation from center (50/50) on first vote. `Animated.Value` in `useRef`, spring `useNativeDriver: false`.

2. **Vote buttons** — labels stay static ("Agree"/"Disagree" never change). Your choice: amber bg/border/text. Other option: slate-blue bg/border/text, not tappable.

3. **New meta line** — `"{votes} votes · {opinions} opinions · you voted with the majority/minority"`. Majority/minority only after voting.

4. **"Voices" → "Opinions"** — all UI text updated (`CommentSection.tsx` heading + empty state, `CommentInput.tsx` placeholder + blocked message). API field `comment_count` unchanged.

5. **Hide results before voting** in feed cards — neutral bar only, no percentages, meta line shows just counts.

6. **Vote-to-unlock** in poll detail — STATE A: question + neutral VoteBar + lock indicator ("lock-closed-outline Vote to unlock opinions and stats") + VoteButtons. STATE B: full UI with fade animations (lock fades out 200ms, opinions section fades in 300ms with 200ms delay via `Animated.timing delay` option). CommentInput also hidden before voting.

7. **Clickable affordance** on feed cards — `chevron-forward-outline` 14px `colors.textTertiary` at right end of meta row.

8. **Tags system** — migration `012_poll_tags.sql` (poll_tags table, indexes, grants, seed tags for 50 polls). Submit screen tag input (max 5, lowercase, hyphen-normalized, space/comma to add, pill display with remove). Feed function `?tag=` filtering + tags returned on each poll. FeedModeTabs tag filter row (amber active, neutral inactive) when tags exist. `hooks/useFeed.ts` `filterTag` + `selectTag`. `lib/api.ts` tag params on `fetchFeed` + `submitPoll`. `types/database.ts` `tags?: string[]` on `PollWithCounts`.

New color tokens added: `slateVote` (#2A3440 dark / #D4DDE6 light), `slateVoteBorder` (#3A4550 dark / #C4CDD6 light), `slateVoteText` (#6B8299 both modes).

Files created/updated: `components/poll/VoteBar.tsx` (new), `components/poll/VoteButtons.tsx`, `components/feed/PollCard.tsx`, `components/feed/PollCardCompact.tsx`, `components/feed/FeedModeTabs.tsx`, `components/poll/CommentSection.tsx`, `components/poll/CommentInput.tsx`, `app/poll/[id]/index.tsx`, `app/(tabs)/submit.tsx`, `app/(tabs)/index.tsx`, `hooks/useFeed.ts`, `lib/api.ts`, `supabase/functions/feed/index.ts`, `supabase/functions/submit-poll/index.ts`, `types/database.ts`, `constants/colors.ts`, `supabase/migrations/012_poll_tags.sql`.

### ✅ Phase 11 — Post-launch fixes (Session 31)

**VoteBar bug fixes:**
- Disagree at 0% agree showed a slate triangle on the left — fixed by collapsing the slash offset to zero when `splitPx` is at either edge (`top = bottom` when at 0 or BAR_W)
- Both percentage labels now use `#FFF8F0` (warm white) on any background — weight differentiates your side (600) from the other (500). The old `SLATE_TEXT` (#6B8299) was illegible on slate backgrounds.

**"Closing soon" false positive — fixed in 3 places:**
- `app/poll/[id]/index.tsx`, `app/poll/[id]/stats.tsx`: time strip now only renders when `formatTimeRemaining()` returns non-null (< 7 days) or poll is already closed. The `?? 'Closing soon'` fallback that fired for all polls with any `expires_at` has been removed.

**Feed filter redesign:**
- `FeedModeTabs` collapsed from two rows (mode tabs + hashtag row) into a single scrollable filter row: `All · For You · Timed · Politics · Culture · Food · Ethics · Sports · Tech · Relationships · Hypothetical · News · Entertainment · Other · In Review`
- `useFeed` replaced `mode: FeedMode + filterTag: string | null` with a single `filter: FeedFilter` string; `switchMode + selectTag` replaced by `switchFilter`
- `lib/api.ts` `fetchFeed` params updated: `tag` → `category?: string, timed?: boolean`
- `supabase/functions/feed/index.ts` supports `?category=` and `?timed=true` query params; removed hashtag/tag-lookup path; removed `closest` sort
- `app/(tabs)/index.tsx` simplified (removed `useMemo` availableTags)

**Per-user vote isolation (`hooks/useVote.ts`):**
- Storage key changed from shared `voted_polls` to `voted_polls_${userId}`
- Listens to `supabase.auth.onAuthStateChange`: clears vote state on `SIGNED_OUT`, loads the new user's votes on `SIGNED_IN` (only if user ID differs)
- Prevents previous user's vote decisions from bleeding into a new session

### ✅ TanStack Query Migration + AsyncStorage Persistence (complete)

All data fetching migrated to `@tanstack/react-query` v5 with stale-while-revalidate caching and user-scoped cache keys.

- `app/_layout.tsx`: `QueryClient` created as module-level singleton (staleTime 5m, gcTime 30m, retry 2); `PersistQueryClientProvider` wraps the entire tree with a user-scoped `AsyncStorage` persister (`tq-cache-${userId}`); `signOut` calls `queryClient.clear()` + `AsyncStorage.removeItem` of the signed-out user's cache key. Persister is a `useMemo` keyed on `userId` so it recreates automatically on user change.
- `hooks/useFeed.ts`: `filter: FeedFilter` is now a **parameter** (moved from internal state). Uses `useInfiniteQuery(['feed', userId, filter])`. `updatePollCounts`, `updatePollUpvote`, `prependPoll` use `queryClient.setQueryData` via a `queryKeyRef` so Realtime mutations always target the current cache entry.
- `hooks/usePollDetail.ts`: Uses `useQuery(['poll', pollId, userId])`. Realtime comment subscription writes via `queryClient.setQueryData`. All optimistic comment methods (`addOptimisticComment`, `confirmComment`, `removeComment`, `updateCounts`) converted to `setQueryData` mutations.
- `hooks/useExplore.ts`: 5 parallel `useQuery` calls (trending/fresh/contested/categories/closing). `load()` calls `queryClient.invalidateQueries({ queryKey: ['explore'] })`.
- `hooks/useSearch.ts`: `useInfiniteQuery(['search', userId, debouncedQuery, category])` with 350ms debounce via local state. `loadMore()` takes no parameters (query/category are internal). `clear()` resets both debounced and raw state immediately.
- `hooks/usePersonalBoard.ts` (NEW): `useQuery(['board', userId])` wrapping `fetchPersonalBoard`. Exposed: `data`, `loading`, `refreshing`, `error`, `refetch`.
- `hooks/useVote.ts`: Replaced `supabase.auth.onAuthStateChange` subscription with `useAuth()` + `useEffect` on `userId`. After successful vote, also calls `queryClient.setQueryData(['poll', pollId, userId], ...)` to pre-update the poll detail cache.
- `app/(tabs)/index.tsx`: `filter` state lives here, passed to `useFeed(filter)`. Removed `feed.initialLoad()` and `feed.switchFilter` calls. `FeedModeTabs onSelect={setFilter}`.
- `app/(tabs)/board.tsx`: Replaced manual `useState`/`useEffect`/`fetchPersonalBoard` with `usePersonalBoard()`. Uses `useAuth().signOut` (cache already cleared by layout). Removed `supabase` import.
- `app/(tabs)/search.tsx`: `search.loadMore()` call updated — no longer takes query/category parameters.

### ✅ Poll Detail Overhaul + Opinion Voting (complete)

8-part overhaul of the poll detail screen and opinion system:

1. **Removed "X% agree / X% disagree"** — `pctRow` removed; kept only the vote/opinion count row ("X votes · Y opinions", centered, textTertiary)
2. **Contextual insight** — `generateInsight(yesPct, total, userVote)` added to `lib/utils.ts` with 7 rule-based branches; replaces old `getMajorityText`; Inter 13px textTertiary italic centered
3. **"Your opinion" card** — amber tint background (#1E1208 dark / #FDF3E7 light via `useColorScheme`), 3px left border in `colors.accent`, amber label text, full-width text body; pinned above opinions list
4. **Opinion voting system** — migration `013_opinion_votes.sql` (adds `net_score INTEGER DEFAULT 0` to comments, creates `opinion_votes` table with UNIQUE PK `(comment_id, user_id)`, RLS); `supabase/functions/vote-opinion/index.ts` UPSERT + net_score recalculation; `poll` Edge Function updated: comments ordered by `net_score DESC, created_at DESC`, includes `net_score` and `user_opinion_vote` per comment via `opinion_votes` table query in parallel; `lib/api.ts` `voteOnOpinion(commentId, value)` added; `types/database.ts` `PublicComment` gets `net_score?: number` and `user_opinion_vote?: 1 | -1 | null`; `hooks/usePollDetail.ts` `updateOpinionVote(commentId, value, netScore)` added for optimistic updates
5. **Opinion cards** redesigned — ▲ score ▼ voting buttons (Ionicons chevron-up/down); score in amber if >0, rose (#E57373) if <0, textTertiary if 0; upvote active = amber, downvote active = rose; attribution = age + region only (political lean removed); borderRadius 12, padding 14; cardFooter row with attribution flex-1 left, voteRow right
6. **CommentInput reworked** — removed inputRow card; flat bar with surfaceAlt background; char count format changed to "X/150"; Post button uses `colors.border` (not `colors.surfaceAlt`) when disabled
7. **View Stats pill button** — `stats-chart-outline` icon + "View Stats" text; surfaceAlt bg, border, 99px radius; centered
8. **Layout reorder** — revealed section: vote/opinion count → insight → stats pill → your opinion card → opinions list

Files: `lib/utils.ts`, `supabase/migrations/013_opinion_votes.sql`, `supabase/functions/vote-opinion/index.ts`, `supabase/functions/poll/index.ts`, `types/database.ts`, `lib/api.ts`, `hooks/usePollDetail.ts`, `components/poll/CommentSection.tsx`, `components/poll/CommentInput.tsx`, `app/poll/[id]/index.tsx`

Deploy: `supabase db push` + `supabase functions deploy poll vote-opinion`

### ✅ Stats Screen Final Polish (complete, Session 39)

1. **`components/poll/VoteBar.tsx`** — Added optional `agreeCount?`, `disagreeCount?`, `totalCount?` props. When all three provided, `useCounts = true` and labels show "X of Y" format at Inter 12px 600 for both sides. Falls back to percentage display when props absent.
2. **`app/poll/[id]/stats.tsx`** — GroupRow: removed "you" pill badge (keep only amber dot + amber label); removed `{group.total} of {totalVotes} votes` subtext line; passes `agreeCount={group.yes}`, `disagreeCount={group.no}`, `totalCount={totalVotes}` to VoteBar so counts show inside bar; added group row dividers (`borderBottomWidth: 1`, `borderBottomColor: isDark ? '#1E1E1E' : colors.border`, `paddingBottom: 16`, `marginBottom: 16`); votes stat card gets `borderBottomColor: 'rgba(200,118,42,0.4)'`/`borderBottomWidth: 2` accent; opinions stat card gets `borderBottomColor: 'rgba(107,130,153,0.4)'`/`borderBottomWidth: 2` accent; active tab pill gets amber shadow (`shadowColor: AMBER`, `shadowOpacity: 0.3`, `shadowRadius: 12`, `elevation: 6`); SafeAreaView bg `#0A0A0A` on dark mode.

Files: `components/poll/VoteBar.tsx`, `app/poll/[id]/stats.tsx`

### ✅ Stats Screen Fixes (complete, Session 38)

1. **`lib/utils.ts`** — Added `formatGroupLabel(dim, value)`: gender values ("male"→"Male", "female"→"Female", "nonbinary"→"Non-binary", "prefer_not"→"Prefer not to say"), politics raw numbers (-2→"Very Liberal" etc.), fallback capitalize-first
2. **`components/poll/VoteBar.tsx`** — 0% edge case: each label slot conditionally renders an empty `<View />` instead of "0%" text; layout still `space-between` so the remaining label stays correctly positioned
3. **`app/poll/[id]/stats.tsx`** — Split card: removed "X% agree · X% disagree" text line below bar (labels + bar only); GroupRow: removed "X% agree" right-side text and "X of Y voted agree · Z disagree" detail line, replaced with single "{group.total} of {totalVotes} votes" line; added `dim` + `totalVotes` props to GroupRow; uses `formatGroupLabel(dim, group.label)` for display while keeping raw label for `isOwnGroup` comparison; empty tab text changed to "No data yet"; removed unused `noPct` and `splitPcts` style

Files: `lib/utils.ts`, `components/poll/VoteBar.tsx`, `app/poll/[id]/stats.tsx`

### ✅ Stats Screen Overhaul (complete, Session 37)

Full redesign of `app/poll/[id]/stats.tsx`:

1. **Summary cards** — replaced flat 2×2 grid: top row = two `#161616` cards (border `#252525`, radius 14, padding 16) each with an Ionicons icon, 28px 600 number, 12px textTertiary label; second row = full-width split card with "Agree" (amber) / "Disagree" (#6B8299) labels, VoteBar at height=36, and inline-colored "X% agree · X% disagree" row below

2. **Demographic rows** — removed flat bar; each group now uses VoteBar (height=28) with the user's actual vote so amber always = their side; header row: amber dot + group label (amber if own group) + "you" pill (bg #1E1208/#FDF3E7, border amber, 9px text); right side: "X% agree" in amber or #6B8299 per majority; count line: "X of Y voted agree · Z disagree"

3. **Tab pills** — replaced underline tabs with pill filter row (horizontal ScrollView); active: amber bg, #FFF8F0, Inter 13 600; inactive: #1E1E1E/#surfaceAlt bg, #2A2A2A/#borderMid border, textTertiary, Inter 13 400; gap 8px

4. **Header** — "Stats" Inter 16px 600; poll question as 1-line subtitle in textTertiary with marginBottom 20

5. **Empty state per tab** — "No data yet for this group" Inter 13px textTertiary centered (replaces generic "Not enough data yet")

6. **Grammar** — removed "Total votes/voices" labels; stat cards just say "votes" / "opinions"; VoteBar shows percentages in-bar; count lines use exact "X of Y voted agree · Z disagree" format

7. **Skeleton** — updated to match new layout: two side-by-side rect, one wide rect, pill row, three group rects

Files: `app/poll/[id]/stats.tsx`

### ✅ Poll Detail + Opinion Cards Polish (complete, Session 36)

1. **`lib/utils.ts`** — Added `STATE_NAMES` map (all 50 states + DC) and `getStateName(code)` for full state name expansion in attribution
2. **Opinion card redesign** (`components/poll/CommentSection.tsx`) — card bg `#161616` dark / `#FAFAFA` light; border `#252525` dark / `#EBEBEB` light; borderRadius 14; subtle amber top line (absolute, height 1, `rgba(200, 118, 42, 0.15)`); content color `#E8E8E8` dark / `#1A1A1A` light; lineHeight 23; marginBottom 14; attribution uses `getStateName()` for full state names; attribution color `#888888`; DEFAULT pill: bg `#1E1E1E` border `#2A2A2A` color `#555` dark / system colors light; pill icon 12px; pill paddingHorizontal 12
3. **"Your opinion" card redesign** (`app/poll/[id]/index.tsx`) — top/right/bottom border `#3A2510` dark / `#D4976E` light; borderRadius `0 14 14 0`; label row: 6×6 amber dot + "YOUR OPINION" Inter 10px 600 letterSpacing 1.0; gap replaced with marginBottom 8 on labelRow; `marginBottom: 16` on card
4. **Detail screen layout** (`app/poll/[id]/index.tsx`) — removed `gap: 16` from scrollContent; exact gaps: question→bar 12px, bar→buttons 12px, lockRow→buttons 12px, buttons→counts 10px (marginTop on revealedSection), counts→insight 6px, insight→stats 10px, stats→yourOpinion 20px, yourOpinion→opinions 16px; VoteBar wrapped in `voteBarWrap` View (marginBottom 12)
5. **View Stats pill** (`app/poll/[id]/index.tsx`) — paddingHorizontal 16, paddingVertical 7; icon 13px; text Inter 12px 500
6. **CommentInput** (`components/poll/CommentInput.tsx`) — placeholder "Share your opinion..." (removed "(one shot)"); Post button Inter_600SemiBold

Files: `lib/utils.ts`, `components/poll/CommentSection.tsx`, `components/poll/CommentInput.tsx`, `app/poll/[id]/index.tsx`

### ✅ Opinion Cards Redesign + Vote Toggle Fix (complete, Session 35)

1. **Opinion card pill redesign** (`components/poll/CommentSection.tsx`) — replaced chevron score buttons with thumbs-up/down pill buttons; pills: `paddingHorizontal 11 / paddingVertical 5 / borderRadius 99 / borderWidth 1`; DEFAULT: surfaceAlt bg, borderMid border, textTertiary color, outline icon; THUMBS UP active: `#1E1208/FDF3E7` bg, `#C8762A` border/icon/count, filled icon; THUMBS DOWN active: `#1F1010/FFF0F0` bg, `#E57373` border/icon/count, filled icon; attribution = "age · region" only (no political lean); section heading row shows "Opinions" (Inter 15px 600) + "X opinion/opinions" count (Inter 12px textTertiary)

2. **Vote toggle logic** (`supabase/functions/vote-opinion/index.ts`) — replaced UPSERT with three-state logic: no existing vote → INSERT; same value → DELETE (toggle off); different value → UPDATE; returns `{ success, net_score, up_count, down_count, user_vote }` where `user_vote` is null on toggle-off

3. **Types** (`types/database.ts`) — added `up_count?: number` and `down_count?: number` to `PublicComment`

4. **Poll Edge Function** (`supabase/functions/poll/index.ts`) — removed separate `userOpinionVotesResult` query; comments query now embeds `opinion_votes(value, user_id)` via PostgREST; adds `.neq("user_id", userId)` to exclude current user's own comment from the list; up_count/down_count/user_opinion_vote all computed in JS from embedded votes; dropped `political_lean` from users embed (not needed)

5. **Optimistic updates** (`hooks/usePollDetail.ts`) — `updateOpinionVote` now takes `(commentId, value, netScore, upCount, downCount)`; `app/poll/[id]/index.tsx` `handleOpinionVote` computes correct toggle logic locally (toggle-off when same vote, decrement old + increment new when switching)

6. **`lib/utils.ts`** — added `pluralize(n, word)` helper; used in poll detail count row and CommentSection heading

7. **Your opinion card** (`app/poll/[id]/index.tsx`) — asymmetric border-radius `0 / 12 / 12 / 0`; border-width 1 all sides + border-left 3px; left border `#C8762A`, other borders `colors.border`; "YOUR OPINION" label Inter 10px 500 uppercase letter-spacing 1.2; padding 14px 16px; text Inter 14px 400 line-height 22

8. **Gear icon** — not in the app code; it's Expo's built-in dev tools overlay (appears in development mode only, not in production builds)

Files: `lib/utils.ts`, `types/database.ts`, `lib/api.ts`, `supabase/functions/vote-opinion/index.ts`, `supabase/functions/poll/index.ts`, `hooks/usePollDetail.ts`, `components/poll/CommentSection.tsx`, `app/poll/[id]/index.tsx`

Deploy: `supabase functions deploy poll vote-opinion`

### ✅ Submit Screen Redesign (complete, Session 43)

Full rewrite of `app/(tabs)/submit.tsx` with live preview card and preset vote-label picker.

1. **Live preview card** — top of screen, updates in real time as user types. Category chip (shows "Category" in `#444` when none selected), question text (`#F5F5F5` 15px 600 when typed, italic `#333` placeholder when empty), neutral 5px `#252525` vote bar, two non-tappable preview buttons matching VoteButton style, "Be the first to vote" meta text. `#161616` bg, `#252525` border, 16px radius.
2. **Question input** — `#161616` bg, `#2A2A2A` border (amber `#C8762A` when focused), 12px radius, 16px 600 Inter. Char counter bottom-right: `#555` 0–120, amber 121–140, `#E57373` 141–150.
3. **Vote label picker** — "How will people vote?" section. Horizontal ScrollView of preset pills (Agree/Disagree, Yes/No, True/False, Support/Oppose, For/Against, Custom). Active pill: amber bg, `#FFF8F0` text, 600. Inactive: `#1E1E1E` bg, `#2A2A2A` border, `#666` text. Custom preset reveals two side-by-side inputs with "/" separator; focused border goes amber. Preview card buttons update in real time.
4. **Category selector** — `#2A2A2A` border unfocused, amber border when selection made. Modal sheet: `#111111` bg, 20px top radius, `#1A1A1A` row dividers, `checkmark-outline` in amber on active row, `Inter_500Medium` 14px text.
5. **Tags** — `#1E1E1E`/`#2A2A2A` pill style (was amber). Input: `#161616` bg, `#2A2A2A` border. Hint text `#444`.
6. **Submit button** — "Start the Debate" (was "Submit for Review"). Amber enabled / `#1E1E1E` disabled. 52px height, 12px radius. Enabled when: question ≥10 chars, category selected, optionA and optionB non-empty.
7. **Submit logic** — `poll_type` derived: `optionA === 'Agree' && optionB === 'Disagree'` → `'binary'`, otherwise `'versus'`. Only sends `option_a`/`option_b` for versus polls (binary always shows Agree/Disagree via VoteButtons fallback).
8. **No Edge Function changes** — `submit-poll` already accepts and stores `option_a`/`option_b` for versus polls.

Files: `app/(tabs)/submit.tsx`

### ✅ Explore Components Polish (complete, Session 42)

Sparse data fixes and visual redesign across explore components.

1. **`components/explore/Top10Card.tsx`** — Redesigned from ghost watermark to row layout: rank number left (48px, amber for 1-3 / `#333` for 4-10, minWidth 44, paddingRight 12), content flex:1 right. Sparse data: `total_count === 0` shows empty bar + italic "Be the first to vote" instead of count/agree%; uses `pluralize()` for vote counts. Card width 240px, row `alignItems: flex-start`.
2. **`components/explore/BlowingUpRow.tsx`** — Icon box: `rgba(200,118,42,0.15)` bg + `rgba(200,118,42,0.3)` 1px border (warm, not muddy). Row: `borderLeftWidth: 2`, `borderLeftColor: rgba(200,118,42,0.4)`, left corners radius 0 / right corners radius 12. Velocity text: `+{n} votes this hour` in amber if velocity > 0; `Gaining momentum` in `#555` if velocity is 0.
3. **`app/(tabs)/search.tsx`** — Section headings: 17px 600 `#F5F5F5`/`#111`, letterSpacing -0.2, subtitle 11px `#555`, marginBottom 12, section gap 28px. Topic grid tiles: minHeight 72px, padding 12, accent 36×36 at 15% opacity, category name 14px, count replaced with pill badge (`#1E1E1E` bg, `#2A2A2A` border, 10px Inter 500 `#666`). Section `isDark` prop replaces `colors` prop. Blowing Up: client-side filter — polls with velocity ≥1 shown first; if fewer than 3 have velocity, falls back to all polls sorted by total_count. Section hidden when blowingUpPolls.length === 0. Universal/Divided sections already hidden when arrays are empty.

Files: `components/explore/Top10Card.tsx`, `components/explore/BlowingUpRow.tsx`, `app/(tabs)/search.tsx`

### ✅ Explore Screen v2 — Full Redesign (complete, Session 41)

Full rewrite of `app/(tabs)/search.tsx` as a discovery page showing only unvoted polls.

1. **`supabase/functions/search/index.ts`** — added `?explore=` mode with 5 sub-modes: `top10_global`, `top10_region`, `blowing_up`, `universal`, `divided`. Voted IDs fetched once upfront, all modes use `enrichPolls()` + filter `user_vote === null`. Regional mode: 3-query approach (user region → region user IDs → their top votes). Velocity proxy: `total_count / hoursLive`. Returns `{ polls, region? }` as `ExploreResponse`.
2. **`lib/api.ts`** — added `fetchExplore(mode)` for the 5 explore modes.
3. **`types/database.ts`** — added `ExploreResponse` interface; added `velocity?: number` to `PollWithCounts`.
4. **`hooks/useExplore.ts`** — complete rewrite: 5 parallel `useQuery` calls (3-minute stale time), client-side `unvoted()` filter, category counts from existing `fetchSearch`. Returns `top10Global`, `top10Region`, `regionName`, `blowingUp`, `universal`, `divided`, `categoryCounts`, `loading`, `error`, `load`, plus individual loading states.
5. **`components/explore/Top10Card.tsx`** (NEW) — 260×180px card, rank watermark (80px behind content), amber/slate 5px horizontal split bar, category/question/vote count/agree%.
6. **`components/explore/BlowingUpRow.tsx`** (NEW) — full-width row, flame icon in `#1E1208` box, question + "+X votes this hour" velocity in amber, chevron right.
7. **`components/explore/ConsensusCard.tsx`** (NEW) — 180px wide, big 32px number in amber (universal) or slate (divided), label, question.
8. **`app/(tabs)/search.tsx`** — fully rewritten. 3 modes: `explore` (default), `search`, `category`. Explore mode: 6 sections (Top 10 Global → Top 10 Regional → Blowing Up → Almost Universal → The World is Divided → Browse by Topic). Category tiles use per-topic accent color triangle (corner-clipped View at 20% opacity). Search bar: `#1A1A1A` bg, `#2A2A2A` border, radius 12. Cancel button, back chevron for category mode. Back-compatible with existing `useSearch` and `usePollState`/`useVote` pattern.

**Deploy:** `supabase functions deploy search`

### ✅ Push Notifications — Crash Fix (Session 40)

`expo-notifications` requires a native EAS build. App crashed with "Cannot find native module ExpoPushTokenManager" after the module was installed. Fix: `hooks/usePushNotifications.ts` stubbed to return `{ expoPushToken: null, notification: null }` without any native imports. `app/_layout.tsx` import and call removed. All Edge Functions kept. `expo-notifications` plugin remains in `app.json` for the next EAS build.

### ✅ Phase 12 — Push Notifications (complete, Session 40)

Full Expo push notification pipeline:

1. **`supabase/migrations/014_push_notifications.sql`** — adds `expo_push_token TEXT` to users table with sparse index on non-null tokens
2. **`hooks/usePushNotifications.ts`** — requests OS permission, gets `ExponentPushToken[...]` via `expo-notifications`, stores token in `users.expo_push_token` via Supabase; handles notification tap → routes to relevant poll or board screen; Android notification channel setup
3. **`app/_layout.tsx`** — calls `usePushNotifications(userId)` in root layout so token registration fires as soon as session is established
4. **`app.json`** — added `expo-notifications` plugin with amber tint `#C8762A`, production mode
5. **`supabase/functions/send-notification/index.ts`** (NEW) — internal service-role endpoint; accepts `{ token, body, data? }` or `{ tokens[], body, data? }`; sends to Expo Push API in batches of 100; validates `ExponentPushToken[` prefix
6. **`supabase/functions/daily-nudge/index.ts`** (NEW) — scheduled cron (run hourly); sends "3 trending debates you haven't weighed in on" to all users with push tokens
7. **`supabase/functions/closing-soon/index.ts`** (NEW) — scheduled cron (run every 15min); finds polls expiring in 1–2hrs, sends notification to users who haven't voted on each
8. **`supabase/functions/cast-vote/index.ts`** — New Trending: when total crosses 10k, fires notification to all users (Redis SETNX `poll:id:notified_trending` prevents duplicate sends)
9. **`supabase/functions/generate-insights/index.ts`** — Insight Ready: after successful insights UPSERT, sends "We noticed something interesting about how you vote" to the user
10. **`supabase/functions/submit-poll/index.ts`** — Poll Promoted: after INSERT, sends "Your debate is live — people are voting on it now" to submitter
11. **`types/database.ts`** — added `expo_push_token: string | null` to `DbUser`

**pg_cron setup** (run manually in Supabase SQL Editor after deploying):
```sql
-- Requires pg_cron + pg_net extensions enabled in Supabase project
SELECT cron.schedule('daily-nudge', '0 * * * *',
  $$SELECT net.http_post(url:='<SUPABASE_URL>/functions/v1/daily-nudge',
    headers:='{"Authorization":"Bearer <SERVICE_KEY>"}'::jsonb,
    body:='{}'::jsonb) AS r$$);

SELECT cron.schedule('closing-soon', '*/15 * * * *',
  $$SELECT net.http_post(url:='<SUPABASE_URL>/functions/v1/closing-soon',
    headers:='{"Authorization":"Bearer <SERVICE_KEY>"}'::jsonb,
    body:='{}'::jsonb) AS r$$);
```

**Deploy:** `supabase db push` + `supabase functions deploy send-notification daily-nudge closing-soon cast-vote generate-insights submit-poll`

---

## What's Actually Built

### App shell

- `app/_layout.tsx` — root Stack, QueryClientProvider (module-level QueryClient), AuthContext, font loading (Inter 400/500/600), SplashScreen; signOut clears QueryClient cache
- `app/index.tsx` — launch router: getSession → users row → tour flag → redirect
- `app/(auth)/_layout.tsx` — simple Stack for auth screens
- `app/(tabs)/_layout.tsx` — 4-tab navigator (Feed / Explore / Debate / Board), redirects to auth if no session

### Auth

- `app/(auth)/auth.tsx` — email + password sign in / sign up, single screen with toggle

### Onboarding (7 steps + tour)

- `app/(auth)/onboarding/_layout.tsx` — Stack + OnboardingContext
- age / gender / region / politics / income / education / complete / welcome-tour

### Tab screens

- `app/(tabs)/index.tsx` — Feed screen: filter state, FeedList, mode tabs, Realtime feed:global subscription
- `app/(tabs)/search.tsx` — Full Explore screen v2: 3 modes (explore/search/category), 6 sections (Top 10 Global/Regional/Blowing Up/Universal/Divided/Topic Grid), unvoted-only discovery, Top10Card/BlowingUpRow/ConsensusCard components, per-category accent tiles, closing-soon section
- `app/(tabs)/submit.tsx` — Submit screen v2: live preview card (real-time, "LIVE PREVIEW" label), question input (focus border + char counter), preset vote-label picker (Agree/Disagree · Yes/No · True/False · Support/Oppose · For/Against · Custom), category modal, tags, "Start the Debate" button. poll_type derived from labels.
- `app/(tabs)/board.tsx` — Personal Board: usePersonalBoard hook, worldview summary, stat grid, voting history, pull-to-refresh, sign out text link

### Edge Functions (Deno, npm: imports)

- `supabase/functions/cast-vote/index.ts` — full vote pipeline per SPEC §4; expires_at enforcement (409 if closed); Redis ops in single Promise.all; DB writes fire-and-forget; fires trending notification at 10k votes
- `supabase/functions/feed/index.ts` — paginated feed; filter modes: all/for_you/timed/category; `?category=` and `?timed=true` params; Redis+PG counts with write-back warmup; comment_count batch; JWT cache (shared auth helper); timing logs
- `supabase/functions/poll/index.ts` — poll detail, demographics, full_breakdown, comments ordered by net_score DESC; opinion_votes embedded; has_commented, user_comment, user_demographics; 10-way parallel Promise.all
- `supabase/functions/submit-comment/index.ts` — JWT auth, ban check, duplicate check, Claude moderation (claude-sonnet-4-20250514), INSERT approved-only, Realtime broadcast fire-and-forget
- `supabase/functions/flag-comment/index.ts` — INSERT flag, count flags, auto-block at 3 flags, comment_ban escalation at 3 blocked comments
- `supabase/functions/submit-poll/index.ts` — JWT auth, validation, INSERT polls status='live' (auto-approved), promoted_at+expires_at set, Redis ZADD feed:trending score=10, Realtime broadcast feed:global; fires "Poll live" push notification to submitter
- `supabase/functions/upvote-poll/index.ts` — INSERT poll_upvotes, count-based promotion at 10 upvotes, Realtime broadcast on promotion
- `supabase/functions/personal-board/index.ts` — JWT auth, parallel fetch (votes JOIN polls + user_insights), single vote_counts batch, computes contrarian_score/top_category/actual_lean; returns vote_history + stats + insights + vote_count_at_generation
- `supabase/functions/generate-insights/index.ts` — JWT auth, Claude claude-sonnet-4-20250514 with SPEC §6.2 prompt, UPSERT user_insights; fires "Insight ready" push notification to user
- `supabase/functions/search/index.ts` — GET; optional auth; explore mode (?explore=top10_global/top10_region/blowing_up/universal/divided); keyword FTS + ILIKE parallel merge; ?sort=closing; ?category= filter; shared enrichPolls() with Redis pipeline + write-back
- `supabase/functions/vote-opinion/index.ts` — JWT auth; three-state logic: no vote→INSERT, same→DELETE (toggle off), different→UPDATE; returns { success, net_score, up_count, down_count, user_vote }
- `supabase/functions/send-notification/index.ts` — internal service-role endpoint; accepts single token or tokens[]; sends to Expo Push API in batches of 100
- `supabase/functions/daily-nudge/index.ts` — scheduled cron (hourly); sends "3 trending debates you haven't weighed in on" to all users with push tokens
- `supabase/functions/closing-soon/index.ts` — scheduled cron (every 15min); finds polls expiring in 1–2hrs, notifies unvoted users
- `supabase/functions/warm-redis/index.ts` — one-time utility; bulk-writes all vote_counts rows to Redis in 300-poll pipeline batches; call after seeding or Redis flush
- `supabase/functions/background-sync/index.ts` — Redis→PG sync (inactive, superseded by synchronous PG writes in cast-vote)

### Components

- `components/onboarding/ProgressBar.tsx`, `OptionGrid.tsx`, `PoliticsSlider.tsx`
- `components/poll/VoteButtons.tsx` — binary + versus types, locked post-vote; voted-away button dims at 40% opacity
- `components/poll/VoteBar.tsx` — 44px diagonal SVG split bar; amber = your side, slate = other; spring animation from 50% on first vote; optional agreeCount/disagreeCount/totalCount props for "X of Y" count display inside bar
- `components/feed/PollCard.tsx` — full feed card: category/status badges, diagonal VoteBar, enter animation, optimistic vote; PollStateContext override for count sync; info row "votes · opinions"; zero-vote neutral bar + "Be the first to vote"; chevron affordance; card tap → `/poll/[id]`
- `components/poll/CommentSection.tsx` — "Opinions" heading + count, thumbs-up/down pill voting per opinion, opinion cards with attribution (age · region), subtle amber top-line accent; section hidden before user votes
- `components/poll/CommentInput.tsx` — flat surfaceAlt bar, 150-char counter ("X/150"), placeholder "Share your opinion...", Post button Inter 600; hidden before user votes
- `components/feed/FeedList.tsx` — FlatList wrapper, viewport tracking, per-poll Realtime subs (max 5), error/empty EmptyState, load-more error inline footer
- `components/feed/FeedModeTabs.tsx` — single scrollable filter row: All · For You · Timed · 11 categories · In Review
- `components/feed/PollCardSkeleton.tsx` — shimmer skeleton (opacity loop 0.4→0.8→0.4)
- `components/feed/PollCardCompact.tsx` — horizontal scroll card; 3px colored left border post-vote; animated vote bar; showTimeRemaining prop (rose <1h, amber <24h, tertiary <7d)
- `components/shared/Toast.tsx` — slide-up toast, auto-dismiss 3s, success/error/info variants
- `components/shared/EmptyState.tsx` — icon + heading + subtext + optional CTA button
- `components/explore/Top10Card.tsx` — 240px card, large amber rank number left, question + bar + vote count right; empty state: "Be the first to vote" italic
- `components/explore/BlowingUpRow.tsx` — full-width row, amber flame icon box, question + velocity text; left-edge amber border; "+N votes this hour" or "Gaining momentum"
- `components/explore/ConsensusCard.tsx` — 180px card, big % number (amber = universal, slate = divided), label, question
- `components/board/WorldviewSummary.tsx` — card with amber left border, italic AI summary, "Generated from X votes", shimmer loading state, placeholder for <5 votes
- `components/board/StatCards.tsx` — 2×2 grid: Total Votes / Contrarian Score / Top Category / Your Lean; Inter 600 22px values
- `components/board/VotingHistory.tsx` — chronological vote history, vote label in amber/slate, versus polls show option label, global result %, majority/minority, category badge, tappable; empty state with "Explore Debates" button
- `components/shared/VoteCount.tsx` — formatted count with scale-pulse animation; re-exports formatVoteCount from lib/utils

### Libraries / Hooks

- `hooks/useAuth.ts`, `hooks/useOnboarding.ts`
- `hooks/useNetworkStatus.ts` — NetInfo subscription, exposes `isOnline: boolean`
- `hooks/useFeed.ts` — `useFeed(filter: FeedFilter)`. `useInfiniteQuery(['feed', userId, filter])`. Returns: polls (flattened), loading, refreshing, error, loadMoreError, hasMore, refresh, loadMore, updatePollCounts, updatePollUpvote, prependPoll. setQueryData mutations use a `queryKeyRef` for safe Realtime writes.
- `hooks/useVote.ts` — optimistic castVote, revert on failure, per-poll vote tracking; AsyncStorage key `voted_polls_${userId}`; auth state tracked via `useAuth()` userId watch; after vote success, also updates `['poll', pollId, userId]` cache; `initVote(pollId, value)` hydrates server-known votes; `isPollClosed(pollId)` tracks server-confirmed 409 closures
- `hooks/usePollDetail.ts` — `useQuery(['poll', pollId, userId])`. Realtime comment subscription calls `queryClient.setQueryData`. Optimistic comment methods: `addOptimisticComment`, `confirmComment`, `removeComment`, `updateCounts`.
- `hooks/useExplore.ts` — 5 parallel `useQuery` calls for explore modes (top10_global/top10_region/blowing_up/universal/divided) + category counts. `load()` invalidates `['explore']` queryKey group.
- `hooks/useSearch.ts` — `useInfiniteQuery(['search', userId, debouncedQuery, category])` with 350ms debounce. `search(q, cat?)` sets internal state. `loadMore()` calls `fetchNextPage()`. `clear()` resets immediately.
- `hooks/usePersonalBoard.ts` — `useQuery(['board', userId])` wrapping `fetchPersonalBoard`. Returns: data, loading, refreshing, error, refetch.
- `lib/supabase.ts` — Supabase client
- `lib/redis.ts` — Upstash Redis client
- `lib/api.ts` — fetchFeed, castVote, fetchPoll, fetchSinglePoll, submitComment, flagComment, submitPoll, upvotePoll, fetchPersonalBoard, generateInsights, fetchSearch(q, category, cursor, limit, sort), fetchExplore(mode), voteOnOpinion(commentId, value) — all auto-attach JWT
- `lib/utils.ts` — formatVoteCount(n), formatTimeRemaining(expiresAt) → "Closes in Xm/h/d" or null, formatAttribution(ageRange, regionDetail, politicalLean), generateInsight(yesPct, total, userVote), pluralize(n, word), STATE_NAMES map, getStateName(code)
- `lib/realtime.ts` — subscribeToFeed, subscribeToPoll, subscribeToPollComments, subscribeToUserPrivate, unsubscribeAll; CommentBroadcast now includes age_range, region_detail, political_lean
- `constants/colors.ts` — full DESIGN.md token system + useColors() hook
- `constants/categories.ts` — 11-item CATEGORIES array with light/dark colors + CATEGORY_MAP
- `types/app.ts` — OnboardingData, Poll, PollType
- `types/database.ts` — complete DB types; SearchResponse includes category_counts; CategoryCount interface
- `contexts/PollStateContext.tsx` — global vote state store (pollId → {yes, no, total, userVote}); PollStateProvider wraps root; usePollState() hook; used by PollCard (override layer) and poll detail screen (write layer)

### Database

- Migrations 001–014
  - 001–005: schema, permissions, pg_cron
  - 006: users.has_seen_tour flag
  - 007: comment_flags indexes
  - 008: performance indexes (feed/poll/vote query patterns)
  - 009: submit_poll permissions + upvote indexes
  - 010: personal_board permissions (user_insights grants + vote index)
  - 011: GIN search index on polls.question (FTS)
  - 012: poll_tags table, indexes, grants
  - 013: opinion_votes table + comments.net_score column
  - 014: users.expo_push_token + sparse index
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

- `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold` loaded in `_layout.tsx` (via `@expo-google-fonts/inter`)
- Syne and DM Sans are gone — do not use them anywhere
- SplashScreen hides once fonts load (non-blocking on font error)

### Design system

- Accent: Amber `#C8762A` — primarily for voted state, active buttons, CTAs. Intentional exceptions in explore components: rank numbers (Top10Card), velocity text (BlowingUpRow). These are deliberate design decisions, not violations.
- No green (`#10B981`), no rose (`#F43F5E`), no indigo (`#6366F1`) anywhere in the codebase (rose #E57373 used only for downvote active state and char counter overflow)
- All category badges are neutral (`surfaceAlt` + `border`) — no per-category colors
- Vote bars are amber-only after voting, neutral border before voting (diagonal SVG split, slate-blue = other side)
- Token system in `constants/colors.ts` via `useColors()` hook. Components that need dark-mode-specific values (e.g., `#161616` card bg in explore) may use `isDark` ternaries with hardcoded hex inline — acceptable when the token system doesn't have a precise dark-only equivalent.
- Tokens: `accent`, `accentText`, `accentDark`, `background`, `surface`, `surfaceAlt`, `border`, `borderMid`, `text`, `textSecondary`, `textTertiary`, `textDimmed`, `slateVote`, `slateVoteBorder`, `slateVoteText`

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

### Session 40 — Phase 12: Push Notifications

- `supabase/migrations/014_push_notifications.sql`: `ALTER TABLE users ADD COLUMN expo_push_token TEXT` + sparse index
- `hooks/usePushNotifications.ts` (NEW): `expo-notifications` + `expo-device` + `expo-constants`; `registerForPushNotifications()` requests permission, gets project-scoped push token; `storePushToken()` writes to users row; `addNotificationResponseReceivedListener` routes taps (poll → `/poll/[id]`, insight → `/board`)
- `app/_layout.tsx`: import + call `usePushNotifications(userId)` after session established
- `app.json`: `expo-notifications` plugin added (amber icon tint `#C8762A`, production mode)
- `supabase/functions/send-notification/index.ts` (NEW): service-role-only wrapper; sends to Expo Push API `https://exp.host/--/api/v2/push/send` in 100-msg batches; validates token format
- `supabase/functions/daily-nudge/index.ts` (NEW): fetches 3 trending live polls + all user tokens → calls send-notification; cron schedule: `0 * * * *` (hourly)
- `supabase/functions/closing-soon/index.ts` (NEW): finds polls expiring in 1–2hrs, excludes already-voted users per poll → calls send-notification; cron: `*/15 * * * *`
- `supabase/functions/cast-vote/index.ts`: added New Trending trigger — when total crosses 10k, SETNX Redis key to prevent duplicate sends, notifies all users
- `supabase/functions/generate-insights/index.ts`: after successful UPSERT, fetches user's push token + sends Insight Ready notification fire-and-forget
- `supabase/functions/submit-poll/index.ts`: after INSERT, fetches submitter's push token + sends Poll Promoted notification fire-and-forget
- `types/database.ts`: `expo_push_token: string | null` added to `DbUser`

### Session 38 — Stats Screen Fixes

- `lib/utils.ts`: added `formatGroupLabel(dim, value)` — maps known gender DB values to display strings, handles raw political lean numbers, capitalizes fallback
- `components/poll/VoteBar.tsx`: 0% side now renders an empty `<View />` instead of "0%" text; `space-between` layout preserved so the non-zero label stays pinned to its correct edge
- `app/poll/[id]/stats.tsx`: split card — removed "X% agree · X% disagree" line (bar is enough); GroupRow — removed "X% agree" from header right, removed "X of Y voted agree · Z disagree" detail, replaced with "{group.total} of {totalVotes} votes"; added `dim` and `totalVotes` props; uses `formatGroupLabel` for display labels; empty tab → "No data yet"; removed `noPct` variable and `splitPcts` style entry

### Session 37 — Stats Screen Overhaul

- `app/poll/[id]/stats.tsx`: full rewrite — removed flat 2×2 summary grid; added two-card top row (votes + opinions, each with icon/28px number/label on `#161616` bg with `#252525` border, radius 14); added full-width split card (Agree/Disagree labels + VoteBar height=36 + inline colored pct row); replaced underline tabs with horizontal ScrollView of pill filters (amber active, `#1E1E1E`/`#2A2A2A` inactive dark); replaced animated fill bars with VoteBar height=28 per group (user's vote passed so amber = their side); each group header: ownDot + label (amber if own) + "you" pill + right "X% agree" in amber/slate; count line "X of Y voted agree · Z disagree"; empty tab text "No data yet for this group"; skeleton updated; removed formatVoteCount for stat cards (raw number via formatVoteCount); removed DemographicGroup dependency on old flat bar

### Session 36 — Poll Detail + Opinion Cards Polish Pass

- `lib/utils.ts`: added `STATE_NAMES` (all 50 US states + DC) + `getStateName(code)` — expands abbreviations to full names for opinion card attribution
- `components/poll/CommentSection.tsx`: opinion card bg → `#161616`/`#FAFAFA`; border → `#252525`/`#EBEBEB`; borderRadius → 14; amber top line (absolute View, height 1, `rgba(200,118,42,0.15)`); content color → `#E8E8E8`/`#1A1A1A`, lineHeight 23, marginBottom 14; attribution uses `getStateName()`, color fixed `#888888`; DEFAULT pill: dark `#1E1E1E`/`#2A2A2A`/`#555`, light system colors; pill icon 12px, paddingHorizontal 12
- `components/poll/CommentInput.tsx`: placeholder changed to "Share your opinion..." (removed "(one shot)"); Post button weight `Inter_600SemiBold`
- `app/poll/[id]/index.tsx`: "Your opinion" card — border top/right/bottom → `#3A2510`/`#D4976E`; borderRadius 0/14/14/0; label row: amber dot (6×6) + "YOUR OPINION" Inter 10px 600 letterSpacing 1.0 + marginBottom 8 on labelRow; card `marginBottom: 16`; layout gap overhaul — replaced `gap: 16` on scrollContent/revealedSection with individual `marginBottom`/`marginTop` per element; exact spacings: q→bar 12, bar→lockRow 12, lockRow→buttons 12, buttons→revealedSection 10, counts→insight 6, insight→stats 10, stats→yourOpinion 20, yourOpinion→opinions 16; VoteBar wrapped in `voteBarWrap` View; stats pill: paddingH 16, paddingV 7, icon 13px, text 12px

### Session 33 — TanStack Query AsyncStorage Persistence

- `npx expo install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client`
- `app/_layout.tsx`: replaced `QueryClientProvider` with `PersistQueryClientProvider` from `@tanstack/react-query-persist-client`; added `createAsyncStoragePersister` from `@tanstack/query-async-storage-persister`; `useMemo` creates a new persister whenever `userId` changes (key: `tq-cache-${userId ?? 'anonymous'}`); `persistOptions.maxAge` = 24h, `shouldDehydrateQuery` only persists successful queries; `signOut` captures `prevUserId` before sign-out, then calls `queryClient.clear()` + `AsyncStorage.removeItem('tq-cache-${prevUserId}')` to purge the user's cache from disk
- Cache behaviour: on app kill + reopen, `PersistQueryClientProvider` restores all `status === 'success'` queries from AsyncStorage → feed, board, explore load instantly with no network request; background refetch fires if data is stale (>5m old)

### Session 32 — TanStack Query Migration

- `npx expo install @tanstack/react-query` — installed @tanstack/react-query v5
- `app/_layout.tsx`: added `QueryClient` (module-level singleton, staleTime 5m, gcTime 30m, retry 2), `QueryClientProvider` wrapping the full tree, `queryClient.clear()` in `signOut`
- `hooks/useFeed.ts`: full rewrite — accepts `filter: FeedFilter` as parameter; `useInfiniteQuery(['feed', userId, filter])`; `updatePollCounts`/`updatePollUpvote`/`prependPoll` use `queryClient.setQueryData` via `queryKeyRef`; `loadMoreError` tracked as local state; no more `switchFilter`/`initialLoad`
- `hooks/usePollDetail.ts`: full rewrite — `useQuery(['poll', pollId, userId])`; Realtime subscription writes via `setQueryData`; all optimistic comment mutations converted to `setQueryData`
- `hooks/useExplore.ts`: full rewrite — 5 parallel `useQuery` calls; `load()` → `invalidateQueries`
- `hooks/useSearch.ts`: full rewrite — `useInfiniteQuery` with 350ms internal debounce; `loadMore()` takes no parameters; `clear()` resets both raw and debounced state
- `hooks/usePersonalBoard.ts` (NEW): `useQuery(['board', userId])` wrapping `fetchPersonalBoard`
- `hooks/useVote.ts`: replaced `supabase.auth.onAuthStateChange` with `useAuth()` userId watch; added `useQueryClient` + `queryClient.setQueryData` on vote success to pre-warm poll detail cache
- `app/(tabs)/index.tsx`: filter state moved to screen (`useState<FeedFilter>('all')`); removed `feed.initialLoad()` effect; `FeedModeTabs` receives `active={filter} onSelect={setFilter}`
- `app/(tabs)/board.tsx`: replaced manual fetch state with `usePersonalBoard()`; `signOut` via `useAuth()`; removed `supabase` import and `fetchPersonalBoard` import
- `app/(tabs)/search.tsx`: `search.loadMore()` — removed query/category arguments (now internal to hook)

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

### Sessions 28–29 — Full Visual Overhaul (DESIGN.md v2.0)

Complete design system replacement across every screen and component.

**Rules enforced:**
- Every color from `useColors()` — zero hardcoded hex values
- No green `#10B981`, no rose `#F43F5E` anywhere in active files
- No Syne, no DM Sans anywhere — Inter only (`Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`)
- Amber `#C8762A` only on user-interacted elements
- All category badges neutral — removed all CATEGORY_LIGHT/CATEGORY_DARK/CATEGORY_MAP/CATEGORY_COLORS logic
- `Animated.Value` in `useRef`, `useNativeDriver: true` for opacity/transform, `false` for width
- Removed `colors.primary`, `colors.agree`, `colors.disagree`, `colors.trending`, `colors.agreeText`, `colors.disagreeText`
- Removed `ThemedText`, `ThemedView`, `useTheme` from all active screens

**Vote bar behaviour:** neutral border line before vote; single amber fill after vote (not split green/rose).

**Files changed (30+):**
`constants/colors.ts`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/board.tsx`, `app/(tabs)/submit.tsx`, `app/(tabs)/search.tsx`, `app/(auth)/auth.tsx`, `app/(auth)/onboarding/welcome-tour.tsx`, `app/(auth)/onboarding/age.tsx`, `app/(auth)/onboarding/gender.tsx`, `app/(auth)/onboarding/politics.tsx`, `app/(auth)/onboarding/income.tsx`, `app/(auth)/onboarding/education.tsx`, `app/(auth)/onboarding/region.tsx`, `app/(auth)/onboarding/complete.tsx`, `app/poll/[id]/index.tsx`, `app/poll/[id]/stats.tsx`, `components/feed/PollCard.tsx`, `components/feed/PollCardCompact.tsx`, `components/feed/FeedModeTabs.tsx`, `components/feed/PollCardSkeleton.tsx`, `components/feed/FeedList.tsx`, `components/poll/VoteButtons.tsx`, `components/poll/PollCard.tsx`, `components/poll/CommentSection.tsx`, `components/poll/CommentInput.tsx`, `components/poll/DemographicBreakdown.tsx`, `components/board/StatCards.tsx`, `components/board/WorldviewSummary.tsx`, `components/board/VotingHistory.tsx`, `components/onboarding/OptionGrid.tsx`, `components/onboarding/ProgressBar.tsx`, `components/onboarding/PoliticsSlider.tsx`, `components/shared/Toast.tsx`, `components/shared/EmptyState.tsx`, `components/shared/VoteCount.tsx`

**Expo boilerplate files** (`app/explore.tsx`, `components/web-badge.tsx`, `components/hint-row.tsx`, `components/ui/collapsible.tsx`, `components/app-tabs.web.tsx`, `components/animated-icon.tsx`) still use old patterns but are **unused template scaffolding** — not linked from any active route or screen.

### Session 27 — Phase 10: Performance & Correctness Audit

**Issues found and fixed:**

- `components/feed/PollCard.tsx`: `setTimeout` in enter-animation `useEffect` had no `clearTimeout` — memory leak on fast unmount. Fixed: store timer ID and `return () => clearTimeout(timer)`.
- `components/feed/PollCard.tsx`: not wrapped in `React.memo` — re-rendered on every parent re-render. Fixed: wrapped with `memo(function PollCard(...) {...})`.
- `lib/realtime.ts`: all four subscribe functions returned `() => unsubscribeFromChannel(name)` — stale closure. If component B subscribes after component A to the same channel, A's unsub would kill B's channel. Fixed: capture channel reference at subscribe time, only unsubscribe if `channels.get(name) === channel`. Applied to `subscribeToFeed`, `subscribeToPoll`, `subscribeToPollComments`, `subscribeToUserPrivate`.
- `supabase/functions/feed/index.ts`: N+1 Redis — 20 polls × 4 keys = 80 individual HTTP calls to Upstash. Fixed: single `redis.pipeline()` call sends all keys in one HTTP request, then batch-fetches DB fallback for any Redis misses via `.in('poll_id', missedIds)` instead of per-poll sequential fetches.
- `supabase/functions/search/index.ts`: same N+1 Redis pattern in `enrichPolls()`. Fixed: same pipeline approach (3 keys per poll), user votes and pipeline run in parallel via `Promise.all`, batch DB fallback for misses.
- `components/feed/FeedList.tsx`: FlatList missing performance props. Added: `removeClippedSubviews`, `maxToRenderPerBatch={8}`, `windowSize={5}`, `initialNumToRender={6}`.
- `lib/api.ts`: `fetchFeed` had debug logs but no timing. Replaced verbose debug logs with concise timing log: `[api.fetchFeed] mode=X polls=Y has_more=Z time=Nms`.

**Files unchanged after audit (already correct):**
- `supabase/functions/cast-vote/index.ts` — proper parallelism, fire-and-forget DB, timing logs
- `supabase/functions/personal-board/index.ts` — parallel queries, batched vote_counts fetch
- `supabase/functions/submit-comment/index.ts` — parallel checks, fire-and-forget Redis/broadcast
- `supabase/functions/poll/index.ts` — all 10 queries in one Promise.all, good column selection
- `hooks/usePollDetail.ts` — mountedRef pattern, cleanup on unmount, useCallback throughout
- `hooks/useExplore.ts` — 5-way Promise.all, no realtime, useCallback on load
- `hooks/useVote.ts` — votesRef avoids stale closure, proper AsyncStorage fire-and-forget
- `hooks/useSearch.ts` — stale query guard with activeQueryRef, debounce with clearTimeout
- `contexts/PollStateContext.tsx` — useCallback on mutations, useMemo on value
- `app/(tabs)/index.tsx` — stable callback refs, realtime cleanup on unmount

**Deploy:** `supabase functions deploy feed search`

### Session 26 — Phase 10: Error & Empty States

- `@react-native-community/netinfo` installed via `npx expo install`
- `hooks/useNetworkStatus.ts` (NEW): subscribes to NetInfo events, exposes `isOnline: boolean`; fetches initial state on mount
- `app/_layout.tsx`: added `OfflineBanner` component (absolute position, zIndex 9999, amber bg, "No internet connection" in white DMSans 13px); renders above Stack; auto-dismisses when connection returns; imports `useNetworkStatus`
- `components/shared/EmptyState.tsx`: added optional `button?: { label: string; onPress: () => void }` prop; renders full-width indigo button below subtext with DMSans 500 15px white text
- `hooks/useFeed.ts`: added `loadMoreError: string | null` field to FeedState; initial load errors set `error`, load-more errors (cursor !== null) set `loadMoreError`; both cleared on new fetch and mode switch
- `components/feed/FeedList.tsx`: added `error?`, `loadMoreError?`, `onRetry?` props; error state (no polls): EmptyState wifi-outline "Couldn't load debates" + "Try Again" button; empty state (no polls, no error): EmptyState chatbubbles-outline "No debates here yet" + "Start a Debate" button → submit tab; load-more error: TouchableOpacity inline footer "Couldn't load more — tap to retry" (DMSans 12px text-tertiary); `onEndReached` disabled while `loadMoreError` set
- `app/(tabs)/index.tsx`: passes `error={feed.error}`, `loadMoreError={feed.loadMoreError}`, `onRetry={feed.refresh}` to FeedList
- `app/(tabs)/search.tsx`: added `router` import, `PollCardSkeleton`, `EmptyState` imports; DefaultExplore loading → PollCardSkeleton × 3 (was ActivityIndicator); DefaultExplore error → EmptyState compass-outline "Couldn't load Explore" with "Try Again" button; SearchResults error state (wifi-outline "Search failed"); SearchResults empty state → EmptyState search-outline with query in heading; CategoryView loading → PollCardSkeleton × 3; CategoryView empty state → EmptyState folder-open-outline with "Start a Debate" button → submit tab; added `skeletonList` and `emptyFlex` styles
- `app/(tabs)/board.tsx`: added `hasError` state separate from loading; error state (no data): EmptyState person-outline "Couldn't load your board" with "Try Again" button in a pull-to-refresh ScrollView; refresh errors show Toast instead of replacing screen; removed WorldviewSummary (was already TODO'd out)
- `app/poll/[id]/index.tsx`: replaced custom error view with `EmptyState` (alert-circle-outline "Debate not found" "It may have been removed" + "Go Back" button); removed now-unused `errorContainer`/`errorText`/`errorBack` styles; back button remains visible in headerBar above the conditional render
- `app/poll/[id]/stats.tsx`: same — replaced custom error view with EmptyState; removed unused error styles
- `components/board/VotingHistory.tsx`: empty history now shows icon + heading + subtext + "Explore Debates" button → navigate to explore tab (was plain italic text)

### Session 25 — Poll Detail Expiry Display + Vote Closure Handling

- `lib/utils.ts`: already had `formatTimeRemaining` — no changes needed
- `hooks/useVote.ts`: added `closedRef` (ref) + `closedSnapshot` (state) to track polls whose expiry is confirmed mid-session by a server 409; `isPollClosed(pollId): boolean` exposed in return value; catch block detects exact error message `'This debate has closed'` (distinct from `'Already voted on this poll'`) and marks poll in `closedRef`/`closedSnapshot`; `isPollClosed` added to return value
- `components/poll/VoteButtons.tsx`: added `(disabled && !voted) && styles.btnDimmed` to both button style arrays — closed polls dim at 40% opacity (no visual difference from a voted-not-this-option state, but confirms non-interactivity)
- `app/poll/[id]/index.tsx`: import changed from `formatVoteCount` via VoteCount to `{ formatVoteCount, formatTimeRemaining }` from `@/lib/utils`; `isPollClosed` destructured from `useVote`; computed `isClosed = isPollClosed(id) || (expires_at exists && past now)`, `timeRemaining = formatTimeRemaining(expires_at)`, `timeColor` (rose <1h, amber <24h, text-tertiary otherwise); time strip inserted between headerBar and content — only when `poll.expires_at` is set — shows clock icon + "Debate closed" (text-tertiary) or timeRemaining or "Closing soon"; `disabled={isClosed}` passed to VoteButtons; `timeStrip` + `timeText` styles added
- `app/poll/[id]/stats.tsx`: same expiry display pattern — `isClosed`, `timeRemaining`, `timeColor` computed; time strip rendered below question subtitle; no `isPollClosed` (no voting on stats screen); `timeStrip` + `timeText` styles added
- Deploy needed: no new Edge Functions — only client-side changes

### Session 24 — Phase 9 Post-Launch: Expanded Search + Closing Soon

- `lib/utils.ts` (NEW): `formatVoteCount(n)` (moved from VoteCount.tsx), `formatTimeRemaining(expiresAt)` → "Closes in Xm/Xh/Xd" or null (null if >7 days or no expires_at), `formatAttribution(ageRange, regionDetail, politicalLean)` → dot-joined attribution string
- `components/shared/VoteCount.tsx`: replaced local `formatVoteCount` definition with `import { formatVoteCount } from '@/lib/utils'` + `export { formatVoteCount }` — all existing importers unchanged
- `supabase/functions/search/index.ts`: full rewrite — expanded keyword search: parallel FTS (textSearch on question) + ILIKE query (category/option_a/option_b) run in Promise.all, merged FTS-first with dedup of extras; new `?sort=closing` branch: queries live polls with non-null expires_at ORDER BY expires_at ASC; shared `enrichPolls()` helper extracts Redis+user-votes enrichment used by all cases
- `lib/api.ts`: `fetchSearch` signature updated — added `sort?: string` as 5th param; sets `?sort=closing` when passed
- `supabase/functions/cast-vote/index.ts`: Redis duplicate check and poll validity check now run in parallel via `Promise.all`; added expires_at enforcement: if `poll.expires_at < NOW()` returns 409 "This debate has closed"; if `poll.status !== 'live'` returns 404
- `hooks/useExplore.ts`: added `closingSoon: PollWithCounts[]` to state; 5-way parallel load now includes `fetchSearch(null, null, null, 5, 'closing')`; filters result to only polls where expires_at is within 7 days
- `components/feed/PollCardCompact.tsx`: added `showTimeRemaining?: boolean` prop; if true and expires_at exists, renders time indicator below vote count — rose if <1h, amber if <24h, text-tertiary if <7d; imports formatTimeRemaining from lib/utils
- `app/(tabs)/search.tsx`: added "Closing Soon" horizontal section between Contested and Browse by Topic in DefaultExplore; only renders if `explore.closingSoon.length > 0`; passes `showTimeRemaining` to those PollCardCompact instances
- `SPEC.md`: updated §11 Poll Lifecycle — documents configurable expiry (30d default for auto-approved), evergreen (null), closed state, cast-vote expiry enforcement, Closing Soon discovery via ?sort=closing
- Deploy: `supabase functions deploy search cast-vote`

### Session 23 — Phase 9: Explore Screen

- `supabase/migrations/011_search_index.sql`: GIN index on `to_tsvector('english', question)` WHERE status='live' for fast full-text search
- `constants/categories.ts`: `CategoryMeta` interface + 11-item `CATEGORIES` array (politics/culture/food/ethics/sports/tech/relationships/hypothetical/news/entertainment/other) with light/dark bg+text colors; `CATEGORY_MAP` record for O(1) lookup
- `supabase/functions/search/index.ts`: GET function, optional auth; Case 1 (no params): returns category_counts by counting all live poll categories in Deno; Case 2 (q): textSearch with plainto_tsquery, offset cursor; Case 3 (category): category filter, promoted_at DESC, offset cursor; per-poll Redis enrichment with vote_counts fallback; returns { polls, cursor, has_more, category_counts? }
- `types/database.ts`: added `CategoryCount`, `SearchResponse` interfaces
- `lib/api.ts`: added `fetchSearch(q, category, cursor?, limit?)` function
- `components/feed/PollCardCompact.tsx`: 280×160px horizontal scroll card; 3px colored left border (agree/disagree if voted, border otherwise); category badge; Syne 700 14px question (3 lines max); 4px animated spring vote bar (flex-animated yes/no); vote count + voted label; reads PollStateContext for live overrides; taps → poll detail
- `hooks/useExplore.ts`: Promise.all of trending/fresh/closest (10 each from feed fn) + category counts (from search fn) on `load()`; state: trending, fresh, contested, categoryCounts, loading, error
- `hooks/useSearch.ts`: debounced (350ms) search with stale-query guard; loadMore for pagination; clear() cancels pending debounce; state: polls, cursor, hasMore, loading, loadingMore, error
- `app/(tabs)/search.tsx`: full Explore screen — search bar (cancel button, clear X); mode: 'explore' | 'search' | 'category'; DefaultExplore: trending/contested horizontal scrolls + CategoryGrid + fresh scroll, pull-to-refresh; SearchResults: debounced FlatList with load more; CategoryView: category-filtered FlatList with header showing category name + count; CategoryGrid: 2-col flexWrap grid with category count badges; ConnectedPollCard wrapper wires useVote + PollStateContext; useVote hoisted to screen level so vote map is shared across all cards
- `app/(tabs)/_layout.tsx`: Search tab renamed to "Explore", icon changed to Ionicons `compass-outline` (inactive) / `compass` (active)
- Deploy: `supabase functions deploy search` + `supabase db push` (for migration 011)

### Session 22 — Phase 8: Personal Board

- `supabase/functions/personal-board/index.ts`: JWT auth, parallel fetch (votes JOIN polls + user_insights in one Promise.all), single vote_counts batch for all poll IDs, computes contrarian_score (% minority votes), top_category (most frequent), actual_lean (from user_insights.political_actual if set); returns vote_history[50] + stats + insights + vote_count_at_generation
- `supabase/functions/generate-insights/index.ts`: JWT auth, parallel fetch (votes + profile), vote_counts batch for yes_pct; calls Claude claude-sonnet-4-20250514 with exact SPEC §6.2 prompt; parses JSON response; UPSERT into user_insights (worldview_summary, contrarian_score, top_categories, political_actual, insights_data, last_generated_at, vote_count_at_generation); returns { generated, insights }
- `supabase/migrations/010_personal_board_permissions.sql`: GRANT SELECT on user_insights to authenticated, GRANT INSERT/UPDATE to service_role; RLS policy users select own insights; idx_votes_user_id_created index
- `types/database.ts`: added VoteHistoryItem, BoardStats, PersonalBoardResponse, GenerateInsightsResponse interfaces
- `lib/api.ts`: added fetchPersonalBoard() and generateInsights() functions
- `components/board/WorldviewSummary.tsx`: card with 3px indigo left border, uppercase "YOUR WORLDVIEW" label, italic DM Sans 14px summary, "Generated from X votes" in indigo, shimmer loading state (2 skeleton lines), placeholder for <5 votes or no insights
- `components/board/StatCards.tsx`: 2×2 flexWrap grid of stat boxes (surfaceAlt bg, 8px radius, 12px pad); Total Votes / Contrarian Score / Top Category / Your Lean; Syne 700 22px value, DM Sans 10px label; contrarian in indigo if >50%; shimmer loading state
- `components/board/VotingHistory.tsx`: "Your Votes" heading; each item shows question (Syne 700 14px, 2 lines), vote label ("Agreed"/"Disagreed" in agree/disagree text colors; versus shows option label), majority/minority label, global result %, category badge; tappable → router.push /poll/[id]; separator between items; shimmer state for 4 items; empty state
- `components/board/index.ts`: exports all three board components
- `app/(tabs)/board.tsx`: full board screen — "Your Board" / "No name. Just your opinions." header; ScrollView with pull-to-refresh; loads personal-board on mount; after load checks if insights stale (total_votes - vote_count_at_generation ≥ 10 OR no insights) and fires generate-insights in background; separate insights state updated when generation completes; sign out demoted to DM Sans 12px text-tertiary text link at very bottom; error toast on load failure
- `lib/api.ts`: added fetchPersonalBoard, generateInsights (plus fetchSinglePoll from Session 21)
- Deploy: supabase functions deploy personal-board generate-insights
- SQL to run in Supabase SQL Editor:
  GRANT SELECT ON public.user_insights TO authenticated;
  GRANT INSERT, UPDATE ON public.user_insights TO service_role;

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
