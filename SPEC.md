Always read CONTEXT.md first, then SPEC.md, then DESIGN.md before
starting any work. Update CONTEXT.md at the end of every session.

## Development Standards

### Performance Patterns — Always Follow

**Client (React Native):**

- NEVER await before updating UI — optimistic updates always fire first
- API calls always fire after UI state is already updated
- On failure: revert UI, show toast, restore input
- Never use crypto.randomUUID() — use:
  Math.random().toString(36).substring(2) + Date.now().toString(36)
- Never block the main thread — all API calls async, fire and forget
  where possible

**Edge Functions:**

- ALWAYS parallelize independent queries with Promise.all
- NEVER sequential awaits in a loop — batch with Promise.all
- Redis operations run before DB operations — Redis is faster
- Realtime broadcast fires after Redis, not after DB
- DB writes that don't affect the response use Promise.allSettled
  and are fire-and-forget
- Log execution time on every function:
  const start = Date.now()
  console.log(`[fnName] done in ${Date.now() - start}ms`)

**Data flow:**

- DB is always source of truth
- Redis is the fast read cache — never the only record
- Client AsyncStorage is convenience cache only — always
  reconcile with server on load
- Optimistic UI reverts on any server error — never leave
  UI in wrong state permanently

### Deprecated Packages — Never Use

- `uuid` below v11 — use `crypto.randomUUID()` natively instead
- `lodash.get` — use optional chaining `?.` operator instead
- `rimraf` below v4
- `glob` below v11
- `inflight`
- `@xmldom/xmldom` below v1.0

### General Rules

- Always use the latest stable version of any package
- Prefer native JavaScript/TypeScript solutions over packages where possible
  (e.g. `crypto.randomUUID()` over uuid, `?.` over lodash.get)
- Before installing any package, confirm it is actively maintained and not deprecated
- Use `uuid@11` if uuid is ever needed

Read DESIGN.md alongside SPEC.md before writing any UI code.
All components must follow DESIGN.md exactly.

# The Debate — Full Technical Specification

> A real-time anonymous polling and debate platform where the world votes, you see where you stand, and your identity stays private.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [Real-Time Architecture](#4-real-time-architecture)
5. [API / Edge Functions](#5-api--edge-functions)
6. [AI Integration](#6-ai-integration)
7. [Mobile App — Screen Inventory](#7-mobile-app--screen-inventory)
8. [Component Tree](#8-component-tree)
9. [Authentication & Onboarding](#9-authentication--onboarding)
10. [Feed Architecture](#10-feed-architecture)
11. [Poll Lifecycle](#11-poll-lifecycle)
12. [Personal Board](#12-personal-board)
13. [Moderation System](#13-moderation-system)
14. [Push Notifications](#14-push-notifications)
15. [Environment & Project Setup](#15-environment--project-setup)
16. [Build Order](#16-build-order)

---

## 1. Product Overview

### Core Concept

The Debate is an anonymous polling platform where users vote on any topic — political, cultural, silly, serious — and see how the world voted broken down by demographics. No usernames, no followers, no social graph. Just your opinion versus the world.

### Core Rules

- No accounts with names or identities — users are a demographic profile only
- One vote per poll per user
- One comment per poll per user (optional)
- No replies to comments
- No liking or reacting to comments
- Results only visible after voting
- Comments are moderated by AI before going live

### Key Screens

1. Feed — live scrolling poll feed with real-time vote counts
2. Poll Detail — vote, see demographic breakdown, read/write comment
3. Submit Poll — create a new poll for community review
4. Personal Board — your voting history, worldview insights, stats
5. Onboarding — demographic capture (no name/identity)
6. Search — find polls by keyword or category

### Revenue Model (post-beta)

- Subscription (Debate Pro): full demographic breakdowns, ad-free, advanced insights
- Sponsored polls: brands pay to surface native polls
- Data licensing: anonymized opinion trend data

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  React Native (Expo)                 │
│         Optimistic UI — never waits for server      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────┐
│              Supabase Edge Functions                 │
│         Vote handler, comment handler,               │
│         feed handler, poll submission                │
└──────┬───────────────┬────────────────┬─────────────┘
       │               │                │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   Upstash   │ │  Supabase   │ │ Claude API  │
│    Redis    │ │  Realtime   │ │(Anthropic)  │
│ (hot counts)│ │ (WebSocket) │ │(moderation  │
│             │ │             │ │ + insights) │
└──────┬──────┘ └─────────────┘ └─────────────┘
       │ async batch write (every 10s)
┌──────▼──────────────────────────────────────────────┐
│                   PostgreSQL                         │
│     (Supabase) — permanent record, insights,        │
│     personal board, data licensing                  │
└─────────────────────────────────────────────────────┘
```

### The Three Tiers

| Tier    | What                           | Technology                        | Latency     |
| ------- | ------------------------------ | --------------------------------- | ----------- |
| Instant | User's own action registers    | Optimistic UI (client state)      | 0ms         |
| Fast    | All clients see updated counts | Upstash Redis + Supabase Realtime | 1–3s        |
| True    | Permanent record               | PostgreSQL                        | 5–30s async |

**PostgreSQL is never in the hot path of user experience.**

---

## 3. Database Schema

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash TEXT UNIQUE NOT NULL,         -- hashed phone, not stored raw
  age_range TEXT,                          -- '18-24', '25-34', '35-44', '45-54', '55-64', '65+' | null if skipped
  gender TEXT,                             -- 'male', 'female', 'nonbinary', 'prefer_not'
  region TEXT,                             -- country code e.g. 'US', 'GB' | null if skipped
  region_detail TEXT,                      -- state/province e.g. 'UT', 'CA'
  political_lean INTEGER,                  -- -2 to +2 (-2=very liberal, 0=moderate, +2=very conservative)
  income_bracket TEXT,                     -- 'under_30k', '30-60k', '60-100k', '100-150k', '150k+'
  education_level TEXT,                    -- 'high_school', 'some_college', 'bachelors', 'graduate'
  comment_strikes INTEGER DEFAULT 0,       -- moderation strikes
  comment_banned BOOLEAN DEFAULT FALSE,    -- loses comment privilege, keeps voting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);
```

### polls

```sql
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT NOT NULL,                  -- see category list below
  poll_type TEXT DEFAULT 'binary',         -- 'binary' (agree/disagree) | 'scale' (1-5) | 'versus' (option_a vs option_b)
  option_a TEXT,                           -- first option label for versus polls (e.g. "Be invisible")
  option_b TEXT,                           -- second option label for versus polls (e.g. "Be able to fly")
  submitted_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',           -- 'pending' | 'live' | 'closed' | 'rejected'
  upvote_count INTEGER DEFAULT 0,          -- community upvotes while pending
  is_evergreen BOOLEAN DEFAULT FALSE,      -- recurring polls (resurface periodically)
  expires_at TIMESTAMPTZ,                  -- set when promoted to live (48hrs default)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Categories
-- 'politics', 'culture', 'food', 'ethics', 'sports',
-- 'tech', 'relationships', 'hypothetical', 'news', 'entertainment'
```

### votes

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  value INTEGER NOT NULL,                  -- binary: 1=agree, -1=disagree | scale: 1-5
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)                 -- one vote per user per poll
);

CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
```

### vote_counts (materialized, async updated)

```sql
CREATE TABLE vote_counts (
  poll_id UUID PRIMARY KEY REFERENCES polls(id),
  yes_count INTEGER DEFAULT 0,
  no_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

### comments

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  ai_decision TEXT NOT NULL,               -- 'approved' | 'blocked'
  ai_reason TEXT,                          -- reason if blocked (internal only)
  ai_score FLOAT,                          -- 0.0-1.0 toxicity score
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)                 -- one comment per user per poll
);

CREATE INDEX idx_comments_poll_id ON comments(poll_id);
```

### comment_flags

```sql
CREATE TABLE comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) NOT NULL,
  flagged_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, flagged_by)
);
```

### poll_upvotes (for pending poll promotion)

```sql
CREATE TABLE poll_upvotes (
  poll_id UUID REFERENCES polls(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(poll_id, user_id)
);
```

### user_insights (AI generated, async)

```sql
CREATE TABLE user_insights (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  worldview_summary TEXT,                  -- AI generated plain-English summary
  contrarian_score FLOAT,                  -- 0-1, how often user votes with minority
  top_categories JSONB,                    -- { politics: 0.4, food: 0.2, ... }
  political_actual FLOAT,                  -- derived from votes, -2 to +2
  demographic_match JSONB,                 -- which demographics align most
  insights_data JSONB,                     -- full structured insights for UI
  last_generated_at TIMESTAMPTZ,
  vote_count_at_generation INTEGER         -- regenerate when 10+ new votes since last
);
```

### Row Level Security

```sql
-- Users can only read/write their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Votes: insert own, never read others individually (only aggregates)
CREATE POLICY "users insert own votes" ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments: insert own, read all approved (no user_id exposed to client)
CREATE POLICY "read approved comments" ON comments FOR SELECT
  USING (ai_decision = 'approved');
```

---

## 4. Real-Time Architecture

### Vote Pipeline

```
1. User taps AGREE/DISAGREE
   └─ Client immediately updates UI (optimistic — 0ms)
      └─ Bar animates, button locks, local count increments

2. HTTP POST → /functions/v1/cast-vote (non-blocking from client)

3. Edge Function:
   a. Validate: check Redis bloom key user:{id}:voted:{poll_id}
   b. Redis INCR poll:{id}:yes (or :no)
   c. Redis INCR poll:{id}:total
   d. Redis SET user:{id}:voted:{poll_id} 1 EX 2592000 (30 day TTL)
   e. Publish to Supabase Realtime channel poll:{poll_id}
      payload: { yes: 84201, no: 61832, total: 146033 }

4. All subscribed clients receive count update → bars animate

5. pg_cron job every 10 seconds:
   └─ Read all Redis poll counts
   └─ Batch UPSERT into vote_counts table
   └─ INSERT individual vote rows into votes table
```

### Comment Pipeline

```
1. User submits comment
   └─ Client optimistically appends with "pending" styling

2. POST → /functions/v1/submit-comment

3. Edge Function:
   a. Check user hasn't already commented (Redis: user:{id}:commented:{poll_id})
   b. Call Claude API for moderation (async)

4a. APPROVED:
   └─ INSERT into comments table
   └─ Redis SET user:{id}:commented:{poll_id} 1
   └─ Publish to Realtime poll:{poll_id}:comments
      payload: { comment: { content, age_range, region, created_at } }
   └─ Client pending indicator clears

4b. BLOCKED:
   └─ Publish rejection to user:{id}:private channel only
   └─ Client removes optimistic comment
   └─ Toast: "Your comment didn't meet community guidelines"
   └─ Nothing written to PostgreSQL
```

### Feed Pipeline

```
1. User opens app → GET /functions/v1/feed?mode=trending

2. Edge Function reads Redis sorted set feed:trending
   └─ Returns top 20 polls with current Redis counts
   └─ Sub 50ms, PostgreSQL not touched

3. Client subscribes to single channel: feed:global

4. Background job every 30 seconds (pg_cron):
   a. Recompute trending scores for all live polls
   b. Update Redis sorted set feed:trending
   c. Publish delta to feed:global:
      {
        promoted: [poll_id],
        demoted: [poll_id],
        new: [poll_id],
        expired: [poll_id],
        counts: { poll_id: { yes, no, total } }
      }

5. Client merges delta:
   └─ Polls animate up/down in ranking
   └─ New polls slide in
   └─ Expired polls fade out
   └─ No full reload
```

### WebSocket Subscriptions (Client)

```typescript
// One connection, multiple channels
// Always active:
supabase.channel("feed:global");

// Active only for polls on screen (max ~5):
supabase.channel(`poll:${id}`); // vote counts
supabase.channel(`poll:${id}:comments`); // new comments

// Private channel for this user:
supabase.channel(`user:${userId}:private`); // moderation results

// Subscribe on scroll into view, unsubscribe on scroll out
```

### Redis Key Structure

```
poll:{id}:yes                 → integer (agree count)
poll:{id}:no                  → integer (disagree count)
poll:{id}:total               → integer (total votes)
poll:{id}:velocity            → integer (votes last hour)

feed:trending                 → sorted set (score = trending algorithm)
feed:fresh                    → sorted set (score = created_at unix)
feed:closest                  → sorted set (score = controversy score)
feed:pending                  → sorted set (score = upvote count)

user:{id}:voted:{poll_id}     → "1" with TTL (duplicate vote check)
user:{id}:commented:{poll_id} → "1" with TTL (duplicate comment check)
```

### Trending Score Algorithm

```typescript
// Runs every 30s in background Edge Function
const yesCount = (await redis.get(`poll:${id}:yes`)) ?? 0;
const noCount = (await redis.get(`poll:${id}:no`)) ?? 0;
const velocity = (await redis.get(`poll:${id}:velocity`)) ?? 0;
const total = yesCount + noCount;

// Controversy bonus: peaks at 1.0 when 50/50, drops toward 0 at 100/0
const yesPct = total > 0 ? yesCount / total : 0.5;
const controversyBonus = 1 - Math.abs(yesPct - 0.5) * 2;

const score =
  velocity * 3 + // recent momentum weighted heavily
  total * 0.1 + // total volume matters less
  controversyBonus * 500; // close splits get boosted

await redis.zadd("feed:trending", score, pollId);
```

---

## 5. API / Edge Functions

### POST /functions/v1/cast-vote

```typescript
// Body: { poll_id: string, value: 1 | -1 }
// Auth: Bearer token (Supabase JWT)

// 1. Verify JWT → get user_id
// 2. Check Redis: user:{id}:voted:{poll_id} → 409 if exists
// 3. Redis INCR appropriate counter
// 4. Publish Realtime update
// 5. Return: { success: true, yes_count, no_count, total }
```

### POST /functions/v1/submit-comment

```typescript
// Body: { poll_id: string, content: string }
// Auth: Bearer token

// 1. Verify JWT → get user_id
// 2. Check user not banned (users.comment_banned)
// 3. Check Redis: user:{id}:commented:{poll_id} → 409 if exists
// 4. Call Claude moderation API
// 5. If approved: INSERT comment, publish Realtime, return { approved: true }
// 6. If blocked: return { approved: false, reason: 'guidelines' }
```

### GET /functions/v1/feed

```typescript
// Query: ?mode=trending|fresh|closest|pending&cursor=string&limit=20
// Auth: Bearer token

// 1. Read Redis sorted set for requested mode
// 2. For each poll_id: get counts from Redis
// 3. Get poll metadata from PostgreSQL (cached, rarely changes)
// 4. Return paginated poll array with current counts
```

### GET /functions/v1/poll/:id

```typescript
// Returns full poll detail including:
// - Poll metadata
// - Current counts from Redis
// - Demographic breakdown from votes table (PostgreSQL)
// - Comments (PostgreSQL, approved only, no user_id)
// - User's own vote if any
```

### POST /functions/v1/submit-poll

```typescript
// Body: { question: string, category: string, poll_type: string }
// Auth: Bearer token

// 1. Basic validation (length, not empty)
// 2. AI duplicate/quality check (Claude)
// 3. INSERT into polls with status: 'pending'
// 4. Add to Redis feed:pending sorted set
// 5. Return: { poll_id, status: 'pending' }
```

### POST /functions/v1/upvote-poll

```typescript
// Body: { poll_id: string }
// Upvotes a pending poll to surface it

// 1. INSERT poll_upvote (unique constraint handles duplicates)
// 2. Redis INCR poll:{id}:upvotes
// 3. Check if threshold reached (10 upvotes for beta)
// 4. If threshold: UPDATE polls SET status='live', expires_at=NOW()+48hrs
//    ZADD feed:trending with initial score
//    Publish to feed:global { new: [poll_id] }
```

### GET /functions/v1/personal-board

```typescript
// Returns:
// - Voting history (from votes + polls JOIN)
// - Current insights (from user_insights table)
// - Stats: total votes, categories breakdown, contrarian score
```

### POST /functions/v1/flag-comment

```typescript
// Body: { comment_id: string }
// Inserts flag, checks threshold (3 flags = auto-hide)
```

### POST /functions/v1/generate-insights

```typescript
// Called when user opens personal board and
// vote_count > last_generation_count + 10
// Calls Claude API with voting history
// Updates user_insights table
```

---

## 6. AI Integration

### 6.1 Comment Moderation

**Endpoint:** Claude API `/v1/messages`  
**Model:** `claude-sonnet-4-20250514`  
**Trigger:** Every comment submission  
**Expected latency:** 400–800ms (async, doesn't block client)

```typescript
const moderationPrompt = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  system: `You are a content moderator for a public anonymous debate platform.
Your job is to assess whether a user comment is acceptable for posting.

BLOCK the comment if it contains ANY of:
- Slurs, hate speech, or derogatory language targeting any group
- Personal attacks on individuals or groups
- Content completely unrelated to the poll topic
- Threats or incitement to violence
- Spam or promotional content

APPROVE the comment if it:
- Expresses an opinion related to the poll topic
- May be strongly worded but is substantive
- Disagrees with other viewpoints respectfully or neutrally

Respond ONLY with valid JSON, no other text:
{ "decision": "approve" | "block", "reason": "brief reason if blocking", "score": 0.0-1.0 }`,

  messages: [
    {
      role: "user",
      content: `Poll question: "${pollQuestion}"
    
User comment: "${commentContent}"`,
    },
  ],
};
```

### 6.2 Worldview Summary (Personal Board)

**Trigger:** User opens personal board + 10+ new votes since last generation  
**Expected latency:** 1–2s (shown with loading state)

```typescript
const insightsPrompt = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  system: `You are an insightful but neutral analyst. Given a user's anonymous voting history 
on a debate platform, generate a thoughtful profile of their worldview.

Be observational, not judgmental. Avoid labeling people as good or bad.
Find interesting patterns, tensions, and surprises.
Write in second person ("You tend to...").

Respond ONLY with valid JSON:
{
  "summary": "3-4 sentence plain English worldview summary",
  "contrarian_score": 0.0-1.0,
  "top_insight": "the single most interesting pattern you found",
  "tension": "any apparent contradiction in their votes (or null)",
  "demographic_note": "how their votes compare to their declared demographics",
  "category_breakdown": { "politics": 0.0-1.0, "food": 0.0-1.0, ... }
}`,

  messages: [
    {
      role: "user",
      content: `User demographics:
Age range: ${user.age_range}
Region: ${user.region}
Declared political lean: ${user.political_lean} (-2=very liberal, +2=very conservative)
Gender: ${user.gender}

Voting history (${votes.length} votes):
${votes.map((v) => `- [${v.category}] "${v.question}" → ${v.value === 1 ? "AGREE" : "DISAGREE"} (${v.yes_pct}% agreed globally)`).join("\n")}`,
    },
  ],
};
```

### 6.3 Poll Quality Check (Submission)

**Trigger:** New poll submitted  
**Purpose:** Catch duplicates, low quality, inappropriate topics

```typescript
const pollQualityPrompt = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  system: `You moderate poll submissions for a debate platform.

REJECT if the poll:
- Is a duplicate or very similar to recent polls (check provided list)
- Contains slurs or hate speech
- Targets or attacks a specific private individual
- Is not a genuine debatable question (too obvious, nonsensical)
- Is longer than 150 characters

APPROVE if the poll:
- Is a genuine debatable question
- Could apply to a broad audience
- Is on any topic: political, silly, cultural, ethical, hypothetical

Respond ONLY with valid JSON:
{ "decision": "approve" | "reject", "reason": "brief reason if rejecting" }`,

  messages: [
    {
      role: "user",
      content: `New poll submission: "${question}"
Category: ${category}

Recent polls in same category for duplicate check:
${recentPolls.map((p) => `- "${p.question}"`).join("\n")}`,
    },
  ],
};
```

---

## 7. Mobile App — Screen Inventory

### Stack

- Expo SDK 51+
- Expo Router (file-based routing)
- React Native
- TypeScript

### Screen Structure

```
app/
  (auth)/
    _layout.tsx
    auth.tsx             — email + password sign in / sign up
    onboarding/
      age.tsx            — age range selection
      gender.tsx         — gender selection
      region.tsx         — country + state/region
      politics.tsx       — political lean slider
      income.tsx         — income bracket (optional)
      education.tsx      — education level (optional)
      complete.tsx       — "You're in" confirmation

  (tabs)/
    _layout.tsx          — bottom tab navigator
    index.tsx            — Feed (Home)
    search.tsx           — Search & Browse
    submit.tsx           — Submit a Poll
    board.tsx            — Personal Board

  poll/
    [id].tsx             — Poll Detail

  _layout.tsx            — Root layout
```

### Navigation Structure

```
Root Stack
└── Auth Stack (if not authenticated)
    ├── Welcome
    ├── Verify OTP
    └── Onboarding Flow (multi-step)

└── Main Tabs (if authenticated)
    ├── Tab 1: Feed
    ├── Tab 2: Search
    ├── Tab 3: Submit (+)
    ├── Tab 4: Personal Board

└── Modal Stack
    └── Poll Detail (push from any tab)
```

---

## 8. Component Tree

```
components/
  feed/
    FeedScreen.tsx           — main feed container, manages subscriptions
    FeedList.tsx             — FlatList with viewport tracking
    PollCard.tsx             — poll card for feed (compact)
    PollCardSkeleton.tsx     — loading placeholder
    FeedModeTabs.tsx         — trending/fresh/closest/foryou tabs
    LiveIndicator.tsx        — animated pulse for hot polls

  poll/
    PollDetail.tsx           — full poll detail screen
    VoteBar.tsx              — animated yes/no percentage bar
    VoteButtons.tsx          — agree/disagree CTA buttons
    DemographicBreakdown.tsx — results by age/region/politics
    CommentSection.tsx       — comments list + input
    CommentCard.tsx          — individual comment (anon, no avatar)
    CommentInput.tsx         — text input + AI moderation feedback
    ResultsReveal.tsx        — animated results reveal after voting

  board/
    PersonalBoard.tsx        — board container
    WorldviewSummary.tsx     — AI generated summary card
    VotingHistory.tsx        — list of past votes
    StatCards.tsx            — contrarian score, topic map etc
    PoliticalDNA.tsx         — shareable worldview graphic
    InsightCard.tsx          — individual insight highlight

  shared/
    CategoryTag.tsx          — pill tag for poll category
    VoteCount.tsx            — animated live vote counter
    PollStatus.tsx           — trending/fresh/closing badges
    EmptyState.tsx           — empty feed/search states
    LoadingSpinner.tsx
    Toast.tsx                — feedback messages

  onboarding/
    OptionGrid.tsx           — selection grid for age/gender etc
    PoliticsSlider.tsx       — political lean slider
    ProgressBar.tsx          — onboarding step progress
```

---

## 9. Authentication & Onboarding

### Auth Flow

```
1. Enter email + password
2. Supabase creates session instantly (no email confirmation)
3. Check if user exists in users table:
   - No → redirect to onboarding
   - Yes → redirect to feed
```

### Onboarding Steps

Each step is a separate screen to reduce cognitive load:

1. **Age Range** — 6 options as large tap targets: 18-24, 25-34, 35-44, 45-54, 55-64, 65+
2. **Gender** — Male, Female, Non-binary, Prefer not to say
3. **Country** — searchable dropdown defaulting to device locale
4. **Region** — state/province based on country selected
5. **Political Lean** — horizontal slider from Very Liberal → Very Conservative, 5 stops
6. **Income** — optional, 5 brackets with "Prefer not to say"
7. **Education** — optional, 4 levels with "Prefer not to say"
8. **Complete** — "You're in. No name. No photo. Just your opinion." + 5 seed polls to vote on immediately

### Seeding Personal Board

On completion, show 5 curated polls covering different categories. This:

- Immediately populates personal board with some data
- Gets users into the core loop before leaving onboarding
- Sets expectation for the app experience

---

## 10. Feed Architecture

### Feed Modes

| Mode        | Sort Logic             | Description                  |
| ----------- | ---------------------- | ---------------------------- |
| Trending    | Velocity score (Redis) | Highest momentum right now   |
| Closest     | Controversy score      | Nearest 50/50 split          |
| Fresh       | Created timestamp      | Newest approved polls        |
| For You     | Category affinity      | Based on your voting history |
| Closing     | expires_at ASC         | Polls ending soon            |
| Your Region | Regional vote delta    | How your area votes vs world |

### Poll Card (Feed)

Each card shows:

- Category tag + status badge (🔥 Trending, ⚡ Hot, 🆕 Fresh, ⏰ Closing)
- Poll question (2 lines max, truncated)
- Live vote bar (yes % / no % animated)
- Vote count + velocity ("847k votes · +12k/hr")
- AGREE / DISAGREE buttons (locks after voting, shows your vote)
- Subtle live pulse animation if actively trending

### Results Reveal

After voting, the bar animates from question state to results state:

- Bar fills to actual percentage with spring animation
- Demographic chips appear below: "Your age group: 71% agree"
- "See full breakdown →" opens poll detail

### Infinite Scroll

```typescript
// Cursor-based pagination (not offset)
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ["feed", mode],
  queryFn: ({ pageParam }) => fetchFeed(mode, pageParam),
  getNextPageParam: (lastPage) => lastPage.cursor,
});
```

---

## 11. Poll Lifecycle

```
SUBMITTED
   ↓ (community upvotes OR admin approval)
   ↓ threshold: 10 upvotes OR manual promote
LIVE (48 hours default)
   ↓ expires_at reached
CLOSED → archived, results permanent, searchable

Evergreen polls → CLOSED → re-queued after 90 days → LIVE again
```

### Poll Detail Page Sections

1. **Question** — large, readable
2. **Vote CTA** — AGREE / DISAGREE (if not yet voted), or your locked vote
3. **Results Bar** — animated, visible after voting
4. **Demographic Breakdown** — tabs: Age / Region / Politics / Gender
5. **Global vs You** — "You voted with the [majority/minority]"
6. **Comments** — flat list, newest first, no threading
7. **Your Comment** — input (if not yet commented) or your comment (locked)
8. **Share** — share result card to external apps

---

## 12. Personal Board

### Stats Displayed

| Stat              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Total Votes       | Count of all polls participated in                    |
| Contrarian Score  | % of times you voted with minority                    |
| Top Category      | Category you vote in most                             |
| Political Actual  | Derived political lean vs declared                    |
| Demographic Match | "You vote most like 35-44 year olds in the Southwest" |

### AI Worldview Summary

- Generated by Claude from voting history
- 3-4 sentence plain English description
- Regenerates every 10 new votes
- Shows loading state while generating
- Displayed at top of board as a card

### Political DNA Card (Shareable)

A generated graphic showing:

- Your voting tendencies on a grid (economic left/right × social lib/auth)
- Top 3 categories
- Contrarian score
- Shareable via React Native Share API

### Voting History

- Chronological list of polls voted on
- Shows: question, your vote, global result, how it compared
- Tappable → opens poll detail

---

## 13. Moderation System

### Layers (in order)

1. **AI Pre-Screen** — Claude evaluates before post. Hard block on slurs/hate. Soft flag on borderline.
2. **Community Flags** — any user can flag. 3 flags in 1 hour → auto-hide pending review.
3. **Strike System** — 3 comment blocks → comment_banned = true. Voting unaffected.

### User-Facing Messages

- Blocked: _"Your comment couldn't be posted. It may contain content that doesn't meet our guidelines. You can try rephrasing."_
- Flagged/hidden: Comment author sees their comment normally. Others don't see it.
- Banned: _"You can still vote on any poll, but commenting isn't available on your account."_

### What AI Checks

```
Hard block (never posts):
- Any slur or hate speech targeting race, gender, sexuality, religion, nationality
- Direct threats
- Spam / promotional content

Soft block (blocked but more lenient message):
- Personal attacks on public figures that cross into threats
- Content entirely unrelated to the poll topic

Always approve:
- Strong opinions, even unpopular ones
- Profanity that isn't targeted hate speech
- Disagreement, criticism, skepticism of any viewpoint
```

---

## 14. Push Notifications

### Notification Types

| Type          | Trigger                                 | Message                                               |
| ------------- | --------------------------------------- | ----------------------------------------------------- |
| Daily Nudge   | 9am local time                          | "3 trending debates you haven't weighed in on"        |
| Closing Soon  | Poll expires in 2hrs, user hasn't voted | "This debate closes in 2 hours"                       |
| New Trending  | Poll crosses 10k votes                  | "This is blowing up right now"                        |
| Insight Ready | New AI insights generated               | "We noticed something interesting about how you vote" |
| Poll Promoted | User's submitted poll goes live         | "Your poll is live — people are voting"               |

### Implementation

```typescript
// Expo Notifications
import * as Notifications from "expo-notifications";

// Register on auth completion
const token = await Notifications.getExpoPushTokenAsync();
// Store token in users table: expo_push_token column

// Send via Supabase Edge Function calling Expo Push API
```

---

## 15. Environment & Project Setup

### Required Accounts (all free)

- Supabase — supabase.com
- Upstash — upstash.com (Redis)
- Anthropic — console.anthropic.com (Claude API)
- Expo — expo.dev (EAS)

### Environment Variables

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # sb_publishable_xxx — safe for client

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Expo
EXPO_PUBLIC_APP_ENV=development|production
```

### Supabase Edge Function Secrets

All secret keys live only in Supabase Edge Function secrets. Never in the client app.

```bash
supabase secrets set SUPABASE_SECRET_KEY=sb_secret_xxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set UPSTASH_REDIS_REST_URL=https://...
supabase secrets set UPSTASH_REDIS_REST_TOKEN=...
```

### Getting Your Keys

- Supabase dashboard → Settings → API Keys tab
- Click "Create new API Keys" if not already created
- Publishable key → client app (.env)
- Secret key → Edge Function secrets only

### Supabase CLI Setup

```bash
brew install supabase/tap/supabase
supabase login
supabase init        # run in repo root
supabase link --project-ref YOUR_PROJECT_REF
```

### lib/supabase.ts

```typescript
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Project Structure

... (rest of section unchanged)

```
the-debate/
  app/                          — Expo Router screens
  components/                   — React Native components
  hooks/                        — Custom hooks (useRealtime, useFeed, useVote)
  lib/
    supabase.ts                 — Supabase client
    redis.ts                    — Upstash Redis client
    api.ts                      — Edge Function callers
    realtime.ts                 — Realtime subscription helpers
  types/
    database.ts                 — Generated Supabase types
    app.ts                      — App-specific types
  constants/
    categories.ts
    config.ts
  supabase/
    functions/
      cast-vote/
      submit-comment/
      feed/
      poll/
      submit-poll/
      upvote-poll/
      personal-board/
      generate-insights/
      flag-comment/
      background-sync/          — Redis → PostgreSQL batch job
      ranking-update/           — Trending score recalculation
    migrations/
      001_initial_schema.sql
      002_rls_policies.sql
      003_indexes.sql
    seed/
      seed_polls.sql            — 50 starter polls across all categories
```

---

## 16. Build Order

Build in this sequence — each step is independently testable before moving on.

### Phase 1 — Foundation

1. Supabase project setup + full schema migration
2. RLS policies
3. Upstash Redis project + test connection
4. Expo project init with Router + TypeScript
5. Supabase client + Redis client setup in `/lib`

### Phase 2 — Auth & Onboarding

6. Phone auth flow (Supabase Auth + Twilio SMS)
7. OTP verification screen
8. Onboarding multi-step flow (all 7 steps)
9. User INSERT on onboarding complete
10. Auth state management + protected routes

### Phase 3 — Core Poll Loop

11. `cast-vote` Edge Function (Redis + Realtime publish)
12. `feed` Edge Function (Redis sorted set read)
13. `poll/:id` Edge Function (full poll detail)
14. Background sync Edge Function (Redis → PostgreSQL batch)
15. Ranking update Edge Function (velocity score recalc)
16. pg_cron jobs for background sync + ranking

### Phase 4 — Feed UI

17. FeedScreen + FeedList with FlatList
18. PollCard component with vote bar
19. Optimistic vote UI
20. Realtime subscription hook (feed:global + poll channels)
21. Feed mode tabs (trending/fresh/closest)
22. Infinite scroll pagination

### Phase 5 — Poll Detail

23. Poll detail screen
24. ResultsReveal animation
25. DemographicBreakdown component
26. CommentSection + CommentCard

### Phase 6 — Comments + Moderation

27. `submit-comment` Edge Function + Claude moderation call
28. CommentInput with optimistic posting
29. Moderation rejection toast
30. `flag-comment` Edge Function
31. Auto-hide threshold logic

### Phase 7 — Submit Poll

32. Submit poll screen UI
33. `submit-poll` Edge Function + Claude quality check
34. `upvote-poll` Edge Function + promotion logic
35. Pending polls visible in Fresh/Pending tab

### Phase 8 — Personal Board

36. `personal-board` Edge Function
37. `generate-insights` Edge Function + Claude insights call
38. Personal board screen + stat cards
39. Voting history list
40. WorldviewSummary component with loading state
41. Political DNA shareable card

### Phase 9 — Search & Discovery

42. Search screen UI
43. Full-text search Edge Function (PostgreSQL FTS)
44. Category browse
45. Search results with vote counts

### Phase 10 — Polish

46. Push notifications setup (Expo + token storage)
47. Notification Edge Functions
48. Seed database with 50 starter polls
49. Error states + empty states
50. Loading skeletons throughout
51. App icon + splash screen
52. EAS build config for TestFlight

---

## Seed Polls (50 to launch with)

### Politics (10)

- Should the voting age be lowered to 16?
- Is universal basic income a good idea?
- Should college education be free?
- Should the Electoral College be abolished?
- Is capitalism the best economic system?
- Should there be term limits for Supreme Court justices?
- Should recreational marijuana be federally legal?
- Is the two-party system broken?
- Should the US have stricter gun laws?
- Should social media companies be regulated like utilities?

### Culture (10)

- Is pineapple acceptable on pizza?
- Is a hot dog a sandwich?
- Should tipping culture be abolished?
- Is remote work better than office work?
- Should phones be banned in schools?
- Is social media doing more harm than good?
- Should there be a 4-day work week?
- Is the internet better or worse than 20 years ago?
- Should violent video games be restricted?
- Is cancel culture a real problem?

### Ethics (10)

- Is it ever okay to lie to protect someone's feelings?
- Should euthanasia be legal?
- Is eating meat ethical?
- Should wealthy people be required to give to charity?
- Is it ethical to have children in today's world?
- Should there be a maximum wage?
- Is privacy more important than security?
- Should organ donation be opt-out rather than opt-in?
- Is graffiti art or vandalism?
- Should AI art be treated the same as human art?

### Relationships (10)

- Is it ever okay to snoop through a partner's phone?
- Should couples combine finances?
- Is jealousy a normal part of relationships?
- Should you tell a friend their partner is cheating?
- Is it okay to be friends with an ex?
- Should couples go to bed angry?
- Is social media bad for relationships?
- Should religion play a role in marriage?
- Is it okay to keep secrets from your partner?
- Should parents read their teenager's texts?

### Hypothetical (10)

- Would you rather know when you die or how you die?
- If you could live forever, would you?
- Would you take a pill that eliminated the need for sleep?
- If you could be famous, would you want to be?
- Would you rather be the smartest or the happiest person alive?
- If you could know any one truth, what would you choose? (agree: personal, disagree: universal)
- Would you rather have more money or more time?
- If AI becomes conscious, should it have rights?
- Would you choose a guaranteed $1M today or a chance at $100M?
- Would you give up 5 years of your life to be perfectly healthy forever?

---

_Document version 1.0 — The Debate_  
_Ready for Claude Code implementation_
