# DESIGN.md — The Debate

> Design system and UI standards. Claude Code must reference this file alongside SPEC.md
> for all UI work. Every component, screen, and animation must follow these rules.

---

## Design Philosophy

**Modern + Gamified without feeling like a game.**
The app should feel alive, data-rich, and satisfying to use. Voting should feel like
a physical action — snappy, weighted, immediate. Results should feel like a reveal.
The UI is serious enough to trust, energetic enough to keep scrolling.

Closest reference points: Twitter/X density and text-forward layout with Duolingo's
sense of satisfaction and momentum. Data-rich like a Bloomberg terminal but approachable.

---

## Typography

### Fonts

```
Display / Headings:  Syne (700 weight only)
Body / UI:           DM Sans (400 regular, 500 medium)
```

Install:

```bash
npx expo install @expo-google-fonts/syne @expo-google-fonts/dm-sans expo-font
```

### Scale

| Role          | Font    | Size | Weight | Usage                      |
| ------------- | ------- | ---- | ------ | -------------------------- |
| Display       | Syne    | 24px | 700    | App name, screen titles    |
| Poll question | Syne    | 17px | 700    | Poll card question text    |
| Body          | DM Sans | 15px | 400    | General UI text            |
| UI medium     | DM Sans | 13px | 500    | Buttons, labels, counts    |
| Meta          | DM Sans | 11px | 400    | Timestamps, secondary info |
| Micro         | DM Sans | 10px | 400    | Badges, chips, captions    |

### Rules

- Poll questions always use Syne 700 — this is the visual anchor of every card
- Never use font weights below 400 or above 700
- Never use system fonts (no San Francisco, no Roboto)
- Line height: 1.3 for headings, 1.6 for body text

---

## Color System

### Core Palette

```
Primary accent:    #6366F1  (Indigo)     — buttons, active tabs, links, highlights
Agree:             #10B981  (Emerald)    — agree button, agree bar, agree state
Disagree:          #F43F5E  (Rose)       — disagree button, disagree bar, disagree state
Trending/Hot:      #F59E0B  (Amber)      — trending badges, hot indicators
Success:           #10B981  (Emerald)    — confirmations, completed states
Warning:           #F59E0B  (Amber)      — closing soon, caution states
```

### Semantic Colors (light/dark adaptive)

```
Background primary:    System white / near-black
Background secondary:  Subtle surface for cards and panels
Background tertiary:   Page background
Text primary:          High contrast body text
Text secondary:        Muted supporting text
Text tertiary:         Hints, placeholders, timestamps
Border:                0.5px subtle borders throughout
```

### Agree / Disagree Color Rules

- AGREE is always Emerald (#10B981) — button bg tint, bar fill, confirmed state icon
- DISAGREE is always Rose (#F43F5E) — button bg tint, bar fill, confirmed state icon
- These two colors are sacred — never use them for anything else in the app
- Agree button: `background: #ECFDF5, color: #059669, border: #6EE7B7`
- Disagree button: `background: #FFF1F2, color: #E11D48, border: #FCA5A5`
- Both buttons adapt slightly in dark mode — tints darken, text lightens

### Dark Mode

- All colors must work in both light and dark mode
- Use React Native's `useColorScheme()` throughout
- Define all colors as a theme object, never hardcode hex values inline
- System default — app follows phone setting automatically

### Theme Object (constants/colors.ts)

```typescript
export const Colors = {
  light: {
    primary: "#6366F1",
    agree: "#10B981",
    agreeLight: "#ECFDF5",
    agreeBorder: "#6EE7B7",
    agreeText: "#059669",
    disagree: "#F43F5E",
    disagreeLight: "#FFF1F2",
    disagreeBorder: "#FCA5A5",
    disagreeText: "#E11D48",
    trending: "#F59E0B",
    trendingLight: "#FEF3C7",
    trendingText: "#92400E",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    surfaceAlt: "#F3F4F6",
    text: "#111827",
    textSecondary: "#6B7280",
    textTertiary: "#9CA3AF",
    border: "#E5E7EB",
    borderStrong: "#D1D5DB",
  },
  dark: {
    primary: "#818CF8",
    agree: "#34D399",
    agreeLight: "#022C22",
    agreeBorder: "#065F46",
    agreeText: "#34D399",
    disagree: "#FB7185",
    disagreeLight: "#2D0A14",
    disagreeBorder: "#9F1239",
    disagreeText: "#FB7185",
    trending: "#FCD34D",
    trendingLight: "#2D1B00",
    trendingText: "#FCD34D",
    background: "#0F0F10",
    surface: "#1A1A1E",
    surfaceAlt: "#242428",
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    border: "#2D2D35",
    borderStrong: "#3D3D47",
  },
};
```

---

## Spacing System

```
4px   — micro gaps, icon padding
8px   — tight component spacing
12px  — inner component padding
16px  — standard padding
20px  — section spacing
24px  — large section gaps
32px  — screen-level vertical rhythm
```

Screen horizontal padding: **16px** on all sides, always.

---

## Border Radius

```
4px   — badges, chips, small pills
8px   — buttons, inputs, small cards
12px  — poll cards, modal sheets
16px  — bottom sheets, large modals
99px  — fully rounded pills, vote bars
```

---

## Component Standards

### Poll Card

The most important component in the app. Every detail matters.

```
Container:
  background: surface color
  border-radius: 12px
  border: 0.5px solid border color
  padding: 16px
  margin-bottom: 12px

Category badge (top left):
  font: DM Sans 10px 500
  padding: 3px 8px
  border-radius: 4px
  background: category-specific light tint
  color: category-specific dark text

Status badge (top right):
  Trending: amber tint
  Fresh: indigo tint
  Closing: rose tint

Poll question:
  font: Syne 17px 700
  color: text primary
  line-height: 1.3
  margin: 8px 0 14px

Vote bar:
  height: 6px (feed) / 10px (detail)
  border-radius: 99px
  agree fill: Emerald #10B981
  disagree fill: Rose #F43F5E
  track: surface alt color

Vote count text:
  font: DM Sans 11px 400
  color: text tertiary
  format: "847k votes · +12k/hr"

Vote buttons:
  height: 44px (minimum tap target)
  border-radius: 8px
  font: DM Sans 13px 500
  side-by-side, equal width
  AGREE: emerald tinted (see colors above)
  DISAGREE: rose tinted (see colors above)
```

### Category Colors

Each category gets its own badge tint:

```
politics:      indigo tint  (#EEF2FF / #4338CA text)
culture:       purple tint  (#F5F3FF / #7C3AED text)
food:          red tint     (#FEE2E2 / #991B1B text)
ethics:        amber tint   (#FFFBEB / #92400E text)
sports:        green tint   (#F0FDF4 / #166534 text)
tech:          blue tint    (#EFF6FF / #1D4ED8 text)
relationships: pink tint    (#FDF2F8 / #9D174D text)
hypothetical:  teal tint    (#F0FDFA / #0F766E text)
news:          gray tint    (#F9FAFB / #374151 text)
entertainment: orange tint  (#FFF7ED / #9A3412 text)
```

### Vote Buttons

```
Pre-vote state:
  AGREE — emerald tinted, full label
  DISAGREE — rose tinted, full label

Post-vote state (locked):
  Voted option: solid filled, checkmark icon + label
  Other option: greyed out, 50% opacity, not tappable

Dark mode: tints deepen, text colors invert appropriately
```

### Vote Bar Animation

This is critical — must feel weighted and satisfying:

```
Trigger: immediately on vote tap (optimistic)
Duration: 600ms
Easing: spring — tension: 180, friction: 22
Direction: bar fills from voted side inward
Before reveal: bar shows as empty/loading state
After reveal: fills to actual percentage with spring
```

Use React Native's `Animated.spring()` or `react-native-reanimated` for this.
Never use `setTimeout` delays — animation should start on tap, not after server response.

### Demographic Breakdown Chips

```
Shown after voting on poll detail screen
Format: "[Group]: [X]% agree"
Style:
  background: surface alt
  border: 0.5px border
  border-radius: 99px
  font: DM Sans 11px 400
  padding: 4px 10px

Examples:
  "Your age group: 71% agree"
  "Your region: 58% agree"
  "Conservatives: 29% agree"
```

### Comments

```
Container: surface card, 12px radius
Each comment:
  background: surface alt
  border-radius: 8px
  padding: 10px 12px
  font: DM Sans 12px 400
  color: text secondary
  line-height: 1.5

Attribution line (below comment):
  font: DM Sans 10px 400
  color: text tertiary
  format: "— [age range]yo, [region]"
  example: "— 28yo, Texas"

No avatar, no username, no like button
```

### Personal Board

```
Worldview summary card:
  Indigo left border accent (3px)
  Italic body text
  "Generated from X votes" in indigo

Stat boxes:
  2x2 grid
  background: surface alt
  Large number: Syne 22px 700
  Label: DM Sans 10px text-tertiary

Contrarian score display:
  Show as percentage
  Color: indigo if > 50%, text-secondary if < 50%
```

### Onboarding Screens

```
Option grid items:
  background: surface
  border: 1.5px solid border
  border-radius: 12px
  padding: 16px
  min-height: 56px
  font: DM Sans 15px 400

Selected state:
  border: 2px solid primary (indigo)
  background: indigo very light tint (#EEF2FF)
  text: indigo

Progress bar:
  height: 3px
  background: border color
  fill: indigo
  border-radius: 99px
  animate fill on step advance
```

### Tab Bar

```
Background: surface / background primary
Border top: 0.5px border
Icon size: 24px
Label: DM Sans 10px
Active: indigo (#6366F1)
Inactive: text tertiary

Tabs:
  Feed    — flame icon (ti-flame)
  Search  — search icon (ti-search)
  Submit  — plus circle (ti-circle-plus) — larger, indigo filled
  Board   — user icon (ti-user)
```

---

## Animation Standards

### Principles

- Animations communicate meaning, not decoration
- Every animation should feel like physics — weight, momentum, snap
- Never animate things the user doesn't care about
- Loading states should be subtle, never blocking

### Timings

```
Micro (button press, state change):  150ms ease-out
Standard (card transitions):         300ms ease-in-out
Vote bar reveal:                     600ms spring
Screen transitions:                  Expo Router defaults (slide)
Onboarding step advance:             250ms ease-in-out slide
```

### Spring Config (vote bar)

```typescript
{
  tension: 180,
  friction: 22,
  useNativeDriver: true
}
```

### Specific Animations

- **Vote tap**: button scales down (0.96) on press, back on release — 150ms
- **Vote bar**: spring fills from 0 to result percentage — 600ms, feels heavy
- **Results reveal**: bar fills, then demographic chips fade in staggered — 100ms apart
- **Poll card enter**: subtle fade + 4px slide up — 200ms, staggered in feed
- **Tab switch**: no animation on tab bar itself, screens use slide from Expo Router
- **Onboarding advance**: current screen slides left, next slides in from right — 250ms

---

## Icons

Use Expo Vector Icons with Ionicons set throughout:

```bash
# Already included with Expo — no install needed
import { Ionicons } from '@expo/vector-icons'
```

### Icon Map

```
Feed tab:        flame-outline / flame (active)
Search tab:      search-outline / search (active)
Submit tab:      add-circle-outline / add-circle (active)
Board tab:       person-outline / person (active)
Back:            chevron-back-outline
Share:           share-outline
Flag:            flag-outline
Close:           close-outline
Agree check:     checkmark-circle
Trending:        trending-up-outline
Fresh:           sparkles-outline
Closing:         time-outline
```

---

## Screen-by-Screen Standards

### Auth Screen

- Clean, minimal — full screen, centered content
- App name in Syne 700 at top
- Tagline: "do something · surprise yourself" in DM Sans italic
- Email + password inputs standard height (48px)
- Primary CTA button: indigo filled, full width, 48px height
- Toggle sign in / sign up as text link below button, not a tab

### Feed Screen

- No decorative header — just app name + search icon
- Feed mode tabs: pill style, indigo fill for active
- Poll cards flush to edges with 16px horizontal padding
- Infinite scroll — no pagination UI
- Pull to refresh supported

### Poll Detail Screen

- Back chevron top left
- Category badge inline with back button
- Question in Syne 700, larger than feed card
- Vote bar 10px tall (vs 6px in feed)
- Demographics shown as scrollable horizontal chip row
- Comments section below demographics
- Comment input pinned to bottom of screen when keyboard opens

### Submit Screen

- Clean form — text input for question, category picker, poll type toggle
- Character count shown (150 char max)
- Submit button disabled until question entered and category selected
- Brief note: "Your poll goes to community review before going live"

### Personal Board

- Greeting: "Your board" — no name
- Worldview summary card at top
- Stats grid below
- Voting history list at bottom — most recent first
- Each history item shows: question (truncated), your vote (color coded), global result

---

## Do Not

- Never use gradients
- Never use drop shadows on cards (border only)
- Never use blur effects
- Never show usernames, avatars, or any identity markers
- Never use red for anything except disagree
- Never use green for anything except agree
- Never animate things the user didn't cause
- Never block the UI with a loading spinner — use skeleton states
- Never use Inter, Roboto, SF Pro, or system fonts
- Never hardcode hex colors inline — always use the Colors theme object
- Never use font weights 600 or 700 in DM Sans — use Syne for heavy weight moments

---

## Skeleton Loading States

Every list and card must have a skeleton state — never show a spinner.

```
Poll card skeleton:
  Category badge: 60px × 18px rounded rect, surface alt
  Question: two lines, full width × 14px, surface alt, 8px gap
  Vote bar: full width × 6px, surface alt
  Buttons: two equal rects, 44px tall, surface alt

Animate with a shimmer — subtle opacity pulse 0.4 → 0.8 → 0.4, 1.2s loop
```

---

_Document version 1.0 — The Debate_  
_Add to repo root alongside SPEC.md_
_Claude Code must read both files before writing any UI code_
