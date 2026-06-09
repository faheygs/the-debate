# DESIGN.md — The Debate

> Complete design system. Claude Code must read this file alongside SPEC.md and CONTEXT.md
> before writing any UI code. This replaces all previous design decisions entirely.
> Every component, screen, and animation must follow these rules exactly.

---

## Design Philosophy

**Warm, human, and engineered.**
The app feels alive — like something with a pulse — but built with precision.
The closest reference points are Linear, Vercel, and Robinhood: clean information
architecture, confident typography, nothing wasted. But warmer. More human.

The single most important design decision: **amber only appears when you vote.**
Before voting, the UI is entirely neutral. After voting, your choice lights up amber.
The other option dims away. You are only ever seeing yourself reflected back.
This is the visual language of the entire app.

---

## Typography

### Font

**Inter** — one font, used for everything. No mixing.

```bash
npx expo install @expo-google-fonts/inter expo-font
```

Import weights: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`

### Scale

| Role                   | Size | Weight | Usage                                   |
| ---------------------- | ---- | ------ | --------------------------------------- |
| App name / display     | 22px | 600    | App name in header                      |
| Poll question (detail) | 18px | 600    | Full question on detail screen          |
| Poll question (feed)   | 15px | 600    | Question text on feed card              |
| Section heading        | 14px | 600    | "Opinions", "Your Board" etc            |
| Body                   | 14px | 400    | General text                            |
| UI medium              | 13px | 500    | Buttons, labels, counts                 |
| Meta                   | 11px | 400    | Timestamps, attribution, secondary info |
| Micro                  | 10px | 500    | Badges, category tags, pill labels      |

### Rules

- Inter only — no Syne, no DM Sans, no system fonts
- Letter spacing: -0.3px on headings (20px+), 0 on body
- Line height: 1.3 for headings, 1.6 for body
- Never use weight below 400 or above 600

---

## Color System

### Core Palette

```
Accent:           #C8762A   Warm amber — YOUR vote, active states, CTAs only
                            Never used for decoration or non-interactive elements

Dark background:  #0F0F0F   Near-black, not pure black — has depth
Dark surface:     #1A1A1A   Card background in dark mode
Dark surface alt: #242424   Elevated surface, inputs in dark mode
Dark border:      #2A2A2A   Subtle borders in dark mode
Dark border mid:  #333333   Slightly stronger borders

Light background: #F7F5F2   Warm white — not pure white, has warmth
Light surface:    #FFFFFF   Card background in light mode
Light surface alt:#F2EEE8   Slightly warmer, inputs and secondary surfaces
Light border:     #E8E4DE   Subtle borders in light mode
Light border mid: #DDD9D2   Slightly stronger borders

Text dark:        #F5F5F5   Primary text on dark backgrounds
Text dark-2:      #888888   Secondary text on dark backgrounds
Text dark-3:      #555555   Tertiary/muted text on dark backgrounds
Text dark-4:      #444444   Dimmed text (voted-away button)

Text light:       #1A1A1A   Primary text on light backgrounds
Text light-2:     #888888   Secondary text on light backgrounds
Text light-3:     #AAAAAA   Tertiary/muted text on light backgrounds
Text light-4:     #C8C4BC   Dimmed text (voted-away button)

Accent text:      #FFF8F0   Text on amber backgrounds
Accent dark:      #A85E1E   Darker amber for light mode accents
```

### The Amber Rule

Amber (`#C8762A`) appears in these contexts:

- The vote button you selected (after voting)
- The side of the vote bar representing your choice
- Active tab indicator
- Active feed mode pill
- "Hot" / trending label
- CTAs (submit button, primary actions)
- Links and interactive highlights
- **Explore accents (intentional):** rank numbers in Top10Card, velocity text in BlowingUpRow, icon box borders in BlowingUpRow — these signal ranking/activity signal, a deliberate design exception

Amber NEVER appears:

- On unvoted polls (feed cards, poll detail before voting)
- On the option you did NOT pick
- On neutral/informational UI elements outside the explore accent exceptions above

### Theme Object — constants/colors.ts

Replace the entire file with:

```typescript
export const Colors = {
  dark: {
    accent: "#C8762A",
    accentText: "#FFF8F0",
    accentDark: "#A85E1E",

    background: "#0F0F0F",
    surface: "#1A1A1A",
    surfaceAlt: "#242424",
    border: "#2A2A2A",
    borderMid: "#333333",

    text: "#F5F5F5",
    textSecondary: "#888888",
    textTertiary: "#555555",
    textDimmed: "#444444",

    slateVote: "#2A3440",
    slateVoteBorder: "#3A4550",
    slateVoteText: "#6B8299",
  },
  light: {
    accent: "#C8762A",
    accentText: "#FFF8F0",
    accentDark: "#A85E1E",

    background: "#F7F5F2",
    surface: "#FFFFFF",
    surfaceAlt: "#F2EEE8",
    border: "#E8E4DE",
    borderMid: "#DDD9D2",

    text: "#1A1A1A",
    textSecondary: "#888888",
    textTertiary: "#AAAAAA",
    textDimmed: "#C8C4BC",

    slateVote: "#D4DDE6",
    slateVoteBorder: "#C4CDD6",
    slateVoteText: "#6B8299",
  },
};

export type AppColors = typeof Colors.dark;

import { useColorScheme } from "react-native";
export const useColors = (): AppColors => {
  const scheme = useColorScheme();
  return scheme === "dark" ? Colors.dark : Colors.light;
};
```

---

## Spacing System

```
4px   — micro gaps
8px   — tight component spacing
12px  — inner padding (compact)
16px  — standard padding, screen horizontal padding always
20px  — section spacing
24px  — large gaps
32px  — screen-level vertical rhythm
```

Screen horizontal padding: **16px always, no exceptions.**

---

## Border Radius

```
6px   — badges, category tags, small pills
10px  — buttons, inputs
14px  — poll cards, modal sheets
20px  — bottom sheets
99px  — fully rounded pills, vote bars, mode tabs
```

---

## Component Specifications

### Poll Card (Feed)

```
Container:
  background: colors.surface
  border-radius: 14px
  border: 1px solid colors.border
  padding: 14px 14px 14px 14px
  margin-bottom: 10px

Top row:
  Left: category badge
  Right: status label (if trending/hot/closing)

Category badge:
  background: colors.surfaceAlt
  border: 1px solid colors.border
  border-radius: 6px
  padding: 3px 8px
  font: Inter 10px 500
  color: colors.textSecondary
  ALL categories use the same neutral badge — no category colors

Status label (top right):
  Trending/Hot: colors.accent, Inter 10px 500, no background
  Closing: colors.textTertiary, Inter 10px 500, no background
  Fresh: colors.textTertiary, Inter 10px 500, no background
  Just text, no badge/pill background

Poll question:
  font: Inter 15px 600
  color: colors.text
  line-height: 1.3
  letter-spacing: -0.2px
  margin: 8px 0 12px

Vote bar (VoteBar component — diagonal SVG split):
  height: 44px
  border-radius: 10px
  SVG viewBox: "0 0 300 44", preserveAspectRatio="none"

  BEFORE VOTING:
    Entire bar is colors.border — no fill, no percentages
    "Cast your vote to see results" centered, Inter 11px textTertiary

  AFTER VOTING (diagonal parallelogram split):
    Diagonal slash: 18px lean (topX = bottomX + 18)
    Agree vote: amber polygon left, slate polygon right
      amber: "0,0 {top},0 {bottom},44 0,44"
      slate: remaining area
    Disagree vote: slate polygon left, amber polygon right
    Amber = colors.accent (#C8762A)
    Slate = colors.slateVote (#2A3440 dark / #D4DDE6 light)
    Percentage labels float inside bar, 14px from each edge:
      Your side: Inter 13px 600 colors.accentText (#FFF8F0)
      Other side: Inter 12px 500 colors.slateVoteText (#6B8299)

  Animation: spring from center (50/50) to actual on first vote
    tension: 160, friction: 20, useNativeDriver: false
    Animated.Value in useRef, addListener pattern for SVG points

Info row (below bar):
  Before voting: "{votes} votes · {opinions} opinions" Inter 11px colors.textTertiary
  After voting: "{votes} votes · {opinions} opinions · you voted with the majority/minority"
  chevron-forward-outline 14px colors.textTertiary at right end of row

Vote buttons:
  height: 44px minimum
  border-radius: 10px
  Inter 13px weight
  side by side, equal width
  gap: 8px
  Labels NEVER change (always "Agree"/"Disagree" or option labels)

  BEFORE VOTING — both identical:
    background: colors.surfaceAlt
    border: 1px solid colors.border
    color: colors.textSecondary
    weight: 500

  AFTER VOTING:
    Your choice:
      background: colors.accent (#C8762A)
      border: 1px solid colors.accent
      color: colors.accentText (#FFF8F0)
      weight: 600
    Other option:
      background: colors.slateVote (#2A3440 dark / #D4DDE6 light)
      border: 1px solid colors.slateVoteBorder
      color: colors.slateVoteText (#6B8299)
      weight: 500
      not tappable
```

### Vote Bar Animation

```
Component: components/poll/VoteBar.tsx
Trigger: immediately on vote tap (optimistic)
Type: Animated.spring, tension: 160, friction: 20, useNativeDriver: false
SVG polygon points driven by splitPx state via addListener pattern
Starts at center (150px / 50%) on first vote, springs to actual percentage
For pre-voted renders (mount with vote already set): no animation, set directly
useRef(new Animated.Value(...)) — NEVER useState for Animated.Value
```

### Category Badge (all neutral)

All categories use the same neutral surfaceAlt badge.
No color-coding per category — it adds noise without meaning.
The question itself conveys the topic.

### Status Labels

Plain text labels, no background pill:

- "Hot" — amber color, top right of card
- "Trending" — amber color
- "Closing in Xh" — textTertiary, with time-outline icon
- "Fresh" — textTertiary

### Poll Detail Screen

```
Back button: chevron-back-outline, colors.textTertiary, top left
Category badge: inline, same neutral style as feed card

Question:
  font: Inter 18px 600
  color: colors.text
  letter-spacing: -0.3px
  line-height: 1.3
  full text, no truncation

Vote bar: VoteBar component, height=44px
Same diagonal SVG design as feed card

Vote to unlock:
  STATE A (not voted):
    question + VoteBar (neutral) + lock indicator + VoteButtons
    Lock indicator: lock-closed-outline 14px + "Vote to unlock opinions and stats" Inter 13px textTertiary, centered
    No opinions/stats/comments visible

  STATE B (voted — animations on transition):
    Lock fades out: Animated.timing 200ms
    Opinions section fades in: Animated.timing 300ms, delay: 200ms
    Count row: "{votes} votes · {opinions} opinions" centered textTertiary
    Insight: generateInsight() rule-based italic Inter 13px textTertiary centered
    View Stats pill button, "YOUR OPINION" card (amber left border), opinions list
    CommentInput revealed

Time remaining (if expires_at set):
  time-outline icon + "Closes in Xh"
  < 1hr: amber color
  < 24hr: textSecondary
  > 24hr: textTertiary

"View Stats" button:
  Only shown after user has voted
  Pill style: stats-chart-outline icon + "View Stats", surfaceAlt bg, border, 99px radius
  paddingHorizontal 16, paddingVertical 7; Inter 12px 500; centered

Opinions section heading:
  "Opinions" Inter 15px 600 colors.text (left) + "X opinion/opinions" Inter 12px textTertiary (right)
  Section hidden before user votes

Comment input:
  Flat bar with surfaceAlt background
  Char counter "X/150"; placeholder "Share your opinion..."
  Post button: border color only when empty, amber filled when text present; Inter 600
  Hidden before user votes

```

### Opinions

```
Each opinion card:
  background: #161616 dark / #FAFAFA light
  border: 1px solid #252525 dark / #EBEBEB light
  border-radius: 14px
  padding: 14px
  margin-bottom: 14px
  Subtle amber top-line accent (absolute, height 1, rgba(200,118,42,0.15))

  Content: Inter 14px 400 #E8E8E8 dark / #1A1A1A light, lineHeight 23
  Attribution: Inter 11px #888888 — "age · state" format (no political lean)

  Opinion voting pills (thumbs-up / thumbs-down):
    DEFAULT: surfaceAlt bg, borderMid border, textTertiary, outline icon
    THUMBS UP active: #1E1208/#FDF3E7 bg, amber border/icon/count, filled icon
    THUMBS DOWN active: #1F1010/#FFF0F0 bg, #E57373 border/icon/count, filled icon
    Score: amber if >0, #E57373 if <0, textTertiary if 0
    Three-state toggle: tap same → removes vote; tap other → switches

"YOUR OPINION" card (already commented):
  Left border: 3px solid colors.accent (#C8762A)
  Other borders: 1px solid colors.border
  border-radius: 0 12px 12px 0
  Label: "YOUR OPINION" Inter 10px 500 uppercase letterSpacing 1.2; amber dot
  Text: Inter 14px 400 lineHeight 22; padding 14px 16px
  Shown above opinions list (amber tint bg in dark: #1E1208, light: #FDF3E7)
```

### Tab Bar

```
Background: colors.surface
Border top: 1px solid colors.border
Icon size: 22px
Label: Inter 10px 400

Active tab: colors.accent (#C8762A)
Inactive tab: colors.textTertiary (#555 dark / #AAA light)

Tabs:
  Feed    — ti-flame (active) / ti-flame (inactive, dimmed)
  Explore — ti-compass
  Debate  — ti-circle-plus (larger feel, this is the create action)
  Board   — ti-user
```

### Feed Mode Tabs

```
Horizontal scrollable row below header
Active: background amber (#C8762A), text #FFF8F0, border-radius 99px
Inactive: background transparent, border 1px colors.border,
          text colors.textTertiary, border-radius 99px
Padding: 5px 14px
Font: Inter 11px 500
Gap between pills: 6px
```

### Onboarding Screens

```
Option grid items:
  background: colors.surface
  border: 1px solid colors.border
  border-radius: 12px
  padding: 16px
  min-height: 52px
  font: Inter 15px 400 colors.text

Selected state:
  border: 1.5px solid colors.accent
  background: dark: #1E1208  light: #FDF3E7
  (very subtle amber tint on background)
  text: colors.accent

Progress bar:
  height: 3px
  track: colors.border
  fill: colors.accent
  border-radius: 99px
```

### Personal Board

```
Worldview card:
  border-left: 3px solid colors.accent
  border-radius: 0 12px 12px 0
  background: colors.surface
  padding: 14px
  border: 1px solid colors.border (except left which is accent)

Stat boxes:
  background: colors.surfaceAlt
  border-radius: 10px
  padding: 12px
  Value: Inter 22px 600 colors.text
  Label: Inter 10px 400 colors.textTertiary

Voting history item:
  Your vote "Agreed": colors.accent Inter 12px 500
  Your vote "Disagreed": colors.textSecondary Inter 12px 500
  (Only your agree gets amber — disagreed is neutral)
  Global result: colors.textTertiary Inter 11px
```

### Submit Screen

```
Header: "Start a Debate" Inter 22px 600

Live preview card (top of scroll):
  "LIVE PREVIEW" label above card: 5px amber dot + Inter 10px 500 #555 letterSpacing 0.8
  Card: #161616 bg, #252525 border, radius 16
  Shows: category chip (grey "Category" placeholder), question text (or italic placeholder),
         neutral 5px #252525 bar, two non-tappable preview buttons, "Be the first to vote"
  Updates in real time as user fills the form

Question input:
  background: #161616
  border: 1px solid #2A2A2A → #C8762A (amber) when focused
  border-radius: 12px
  font: Inter 16px 600
  Char counter bottom-right: #555 (0–120) → amber (121–140) → #E57373 (141–150)

Vote label picker ("How will people vote?"):
  Horizontal ScrollView of preset pills
  Presets: Agree/Disagree | Yes/No | True/False | Support/Oppose | For/Against | Custom
  Active pill: amber bg (#C8762A), #FFF8F0 text, Inter 600
  Inactive pill: #1E1E1E bg, #2A2A2A border, #666 text
  Custom preset: reveals two side-by-side inputs with "/" separator
    Input focus border → amber; preview buttons update in real time

Category selector:
  background: colors.surfaceAlt
  border: 1px solid #2A2A2A → amber when selection made
  Modal sheet: #111111 bg, radius 20 top, #1A1A1A dividers
    checkmark-outline amber on active row, Inter 500 14px

Tags:
  Pill style: #1E1E1E bg, #2A2A2A border, #888 text
  Input: #161616 bg, #2A2A2A border; hint text #444

Submit button ("Start the Debate"):
  Enabled: amber bg (#C8762A), #FFF8F0 text
  Disabled: #1E1E1E bg, #444444 text
  height: 52px, border-radius: 12px, Inter 15px 600
  canSubmit: question ≥10 chars + category selected + optionA + optionB non-empty

Submit logic:
  poll_type: optionA === 'Agree' && optionB === 'Disagree' → 'binary', else → 'versus'
  Success: Toast "Your debate is live!" + form reset
```

### Empty States

```
Icon: 32px colors.textTertiary
Heading: Inter 16px 600 colors.text
Subtext: Inter 14px 400 colors.textTertiary
Button (if present): amber filled, same as submit button but smaller
Centered, generous vertical padding
```

### Skeleton Loading

```
All skeletons: colors.surfaceAlt background
Shimmer: opacity pulses 0.3 → 0.7 → 0.3, 1.4s loop
Animated.loop with Animated.sequence
Never use ActivityIndicator anywhere — always skeletons
```

### Toast Notifications

```
Position: bottom of screen, above tab bar, 16px margin
Border-radius: 12px
Padding: 12px 16px
Font: Inter 13px 500

Success: background #1A2E1A (dark) / #F0FAF0 (light)
         text colors.accent area — actually use a green:
         background: dark #1A2A1A, text #4CAF50
Error:   background #2A1A1A (dark) / #FFF0F0 (light)
         text #E57373
Info:    background colors.surfaceAlt, text colors.textSecondary

Slide up 200ms ease-out on appear
Fade out on dismiss, auto 3s
```

---

## Animation Standards

### Principles

- Animations serve communication, not decoration
- Everything feels physical — weight, snap, resolve
- Never animate things the user didn't cause

### Timings

```
Button press (scale):     150ms ease-out → scale 0.97 on press
Vote bar reveal:          500ms spring (tension: 200, friction: 24)
Screen transitions:       Expo Router defaults
Onboarding step:          250ms ease-in-out
Toast appear:             200ms ease-out slide up
Skeleton shimmer:         1.4s loop
```

### Vote Bar Spring

```typescript
Animated.spring(animatedValue, {
  toValue: targetPercentage,
  tension: 200,
  friction: 24,
  useNativeDriver: false,
});
```

### Specific Rules

- Animated.Value always in useRef — never useState
- useNativeDriver: true for opacity/transform animations
- useNativeDriver: false for width/height animations (vote bar)
- No setTimeout for animation delays — use Animated.sequence

---

## Icons

Ionicons from @expo/vector-icons throughout. No other icon set.

```typescript
import { Ionicons } from "@expo/vector-icons";
```

### Icon Map

```
Feed tab active:      flame
Feed tab inactive:    flame-outline
Explore tab:          compass / compass-outline
Debate tab:           add-circle / add-circle-outline
Board tab:            person / person-outline
Back:                 chevron-back-outline
Search:               search-outline
Close/clear:          close-outline
Voices/chat:          chatbubble-outline
Time/closing:         time-outline
Stats:                stats-chart-outline
Share:                share-outline
Trending/hot:         flame-outline (amber colored)
Check/confirmed:      checkmark-circle
Alert:                alert-circle-outline
No internet:          wifi-outline
Empty explore:        compass-outline
Empty board:          person-outline
Empty votes:          checkmark-circle-outline
```

---

## Screen-by-Screen Standards

### Auth Screen

```
Background: colors.background (full screen)
App name centered: Inter 28px 600 colors.text, letter-spacing -0.5px
Tagline below: Inter 14px 400 colors.textTertiary italic
  "No name. No photo. Just your opinion."

Email input: colors.surfaceAlt, 1px border, 10px radius, 48px height
Password input: same
Primary button: amber filled, 52px, full width, Inter 15px 600
Toggle sign in/sign up: Inter 13px colors.textTertiary text link below
```

### Feed Screen

```
Header: app name Inter 22px 600 + search icon right, 16px horizontal padding
Mode tabs: horizontal scroll pill row below header
Feed: FlatList, 16px horizontal padding
Pull to refresh: standard RefreshControl, amber tint color
```

### Explore Screen

3 modes: explore (default) | search | category

```
EXPLORE MODE:
Header: "Explore" Inter 22px 600
Search bar: #1A1A1A bg, #2A2A2A border, radius 12, 44px
Sections stack with 28px gap between each section

Section heading: Inter 17px 600 #F5F5F5/##111111, letterSpacing -0.2
Section subheading: Inter 11px #555555
Horizontal scroll rows bleed edge-to-edge (-16px margin, 16px padding)

Top 10 Global / Top 10 Regional:
  Top10Card: 240px wide, rank number left (48px amber), content right
  card bg #161616 dark, radius 16, padding 14, row alignItems: flex-start
  Empty state: neutral bar + italic "Be the first to vote"

Blowing Up:
  BlowingUpRow: full-width, amber flame icon box (38×38, amber border/bg)
  Left edge: borderLeftWidth 2 rgba(200,118,42,0.4), right corners radius 12
  "+N votes this hour" in amber; "Gaining momentum" in #555 when no velocity
  Section hidden when no polls have velocity AND total_count fallback is empty

Almost Universal / The World is Divided:
  ConsensusCard: 180px wide, big % number (amber=universal, #6B8299=divided)

Browse by Topic:
  2-col tile grid; each tile minHeight 72px; category name 14px + count pill badge
  Per-category accent color triangle (36×36 at 15% opacity, bottom-right)
  Count pill: #1E1E1E bg, #2A2A2A border, #666 text, Inter 10px 500

Closing Soon section (between Contested and Browse by Topic):
  PollCardCompact with showTimeRemaining; hidden when empty

SEARCH MODE:
  Activated by tapping search bar — shows Cancel button
  Debounced 350ms; FlatList of PollCardCompact; load-more pagination

CATEGORY MODE:
  Entered by tapping a topic tile; back chevron in header
  Category name + count as section header
  FlatList of PollCardCompact; empty state → "Start a Debate" button
```

### Poll Detail Screen

```
Scrollable, no fixed header (back button floats at top)
16px horizontal padding throughout
Question large and prominent
View Stats: subtle text link, not a button
Voices section flows below vote area
Comment input: sticky at bottom, keyboard aware
```

### Stats Screen

```
Back button + "Stats" title Inter 16px 600
Poll question as subtitle: 1 line, textTertiary, marginBottom 20

Summary cards: top row two side-by-side cards (#161616 bg, #252525 border, radius 14)
  Each: Ionicons icon + 28px 600 number + 12px textTertiary label
  Votes card: amber bottom accent bar (borderBottomWidth 2, rgba(200,118,42,0.4))
  Opinions card: slate bottom accent bar (rgba(107,130,153,0.4))
  Second row: full-width split card with Agree (amber) / Disagree (#6B8299) labels + VoteBar

Tab row: horizontal ScrollView pill filters — Age | Politics | Region | Gender
  Active pill: amber bg (#C8762A), #FFF8F0 text, Inter 13px 600
               amber shadow (shadowColor #C8762A, shadowOpacity 0.3, shadowRadius 12)
  Inactive pill: #1E1E1E bg, #2A2A2A border, textTertiary, Inter 13px 400

Group rows: VoteBar at height=28 (shows "X of Y" counts inside bar)
  User's own group: amber dot + amber label
  Dividers: borderBottomWidth 1, paddingBottom 16, marginBottom 16
  Empty tab: "No data yet for this group" Inter 13px textTertiary centered

SafeAreaView bg: #0A0A0A in dark mode
```

### Submit Screen

```
Header: "Start a Debate" Inter 22px 600
Subtitle: textTertiary 13px
Form flows with 16px gaps between fields
```

### Personal Board

```
Header: "Your Board" Inter 22px 600
Subtitle: "No name. Just your opinions." textTertiary 13px
Worldview card: amber left border accent
Stats grid: 2x2
Voting history: flat list
Sign out: Inter 12px textTertiary text link at very bottom
```

---

## Do Not

- Never use colors other than the palette defined above
- Never use Syne, DM Sans, or any font other than Inter
- Never use green or red for agree/disagree — amber for your vote, slate (#2A3440) for other side
- Never show amber on unvoted feed cards or poll detail (pre-vote state)
- Never use gradients or blur; shadows allowed only for active tab pills (amber shadow, as in stats screen)
- Never use emojis anywhere
- Never use ActivityIndicator — always skeleton states
- Prefer useColors() tokens; hardcoded hex values are acceptable in components where the token system lacks a precise dark-only equivalent (e.g., explore card backgrounds like `#161616`), but use `isDark` ternary consistently
- Never create Animated.Value in useState — always useRef
- Never use font weights 300 or 700 — only 400, 500, 600
- Never use category-specific colors on feed card badges — all neutral surfaceAlt
- Never show percentages on a poll the user hasn't voted on

---

## Migration Notes

This design completely replaces the previous system. When Claude Code
implements this:

1. Replace constants/colors.ts entirely with the new Colors object above
2. Replace all Syne/DM Sans font references with Inter
3. Remove all category color logic — all badges are neutral surfaceAlt
4. Remove all green (#10B981) and rose (#F43F5E) color usage
5. The amber rule is absolute — audit every component for incorrect amber usage
6. Replace all StyleSheet color hardcodes with useColors() values

---

_DESIGN.md v3.0 — The Debate_
_Read this alongside SPEC.md and CONTEXT.md before any UI work_
