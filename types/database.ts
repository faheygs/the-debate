// Database types for The Debate — matches schema in supabase/migrations/

export type PollType = "binary" | "scale" | "versus";
export type PollStatus = "pending" | "live" | "closed" | "rejected";
export type AiDecision = "approved" | "blocked";

// ── Tables ────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  phone_hash: string;
  age_range: string | null;
  gender: string | null;
  region: string | null;
  region_detail: string | null;
  political_lean: number | null;
  income_bracket: string | null;
  education_level: string | null;
  comment_strikes: number;
  comment_banned: boolean;
  has_seen_tour: boolean;
  expo_push_token: string | null;
  created_at: string;
  last_active_at: string;
}

export interface DbPoll {
  id: string;
  question: string;
  category: string;
  poll_type: PollType;
  option_a: string | null;
  option_b: string | null;
  submitted_by: string | null;
  status: PollStatus;
  upvote_count: number;
  is_evergreen: boolean;
  expires_at: string | null;
  created_at: string;
  promoted_at: string | null;
  closed_at: string | null;
}

export interface DbVote {
  id: string;
  poll_id: string;
  user_id: string;
  value: number; // binary: 1=agree, -1=disagree | scale: 1–5
  created_at: string;
}

export interface DbVoteCount {
  poll_id: string;
  yes_count: number;
  no_count: number;
  total_count: number;
  last_synced_at: string;
}

export interface DbComment {
  id: string;
  poll_id: string;
  user_id: string;
  content: string;
  ai_decision: AiDecision;
  ai_reason: string | null;
  ai_score: number | null;
  created_at: string;
}

export interface DbCommentFlag {
  id: string;
  comment_id: string;
  flagged_by: string;
  created_at: string;
}

export interface DbPollUpvote {
  poll_id: string;
  user_id: string;
  created_at: string;
}

export interface DbUserInsight {
  user_id: string;
  worldview_summary: string | null;
  contrarian_score: number | null;
  top_categories: Record<string, number> | null;
  political_actual: number | null;
  demographic_match: Record<string, unknown> | null;
  insights_data: Record<string, unknown> | null;
  last_generated_at: string | null;
  vote_count_at_generation: number | null;
}

// ── API response shapes (returned by Edge Functions) ─────────────────────

export interface PollWithCounts extends DbPoll {
  yes_count: number;
  no_count: number;
  total_count: number;
  velocity?: number;
  user_vote: 1 | -1 | null;
  comment_count?: number;
  user_upvoted?: boolean;
  tags?: string[];
}

export interface SubmitPollResponse {
  poll_id: string;
  status: "live" | "pending";
}

export interface UpvotePollResponse {
  upvoted: boolean;
  promoted: boolean;
  upvote_count: number;
}

export interface VoteHistoryItem {
  poll_id: string;
  question: string;
  category: string;
  poll_type: string;
  option_a: string | null;
  option_b: string | null;
  value: number; // 1 | -1
  yes_count: number;
  no_count: number;
  total_count: number;
  voted_at: string;
}

export interface BoardStats {
  total_votes: number;
  contrarian_score: number; // 0–100 percentage, one decimal
  top_category: string | null;
  actual_lean: number | null; // -2 to +2
}

export interface PersonalBoardResponse {
  vote_history: VoteHistoryItem[];
  stats: BoardStats;
  insights: DbUserInsight | null;
  vote_count_at_generation: number;
}

export interface GenerateInsightsResponse {
  generated: boolean;
  insights: DbUserInsight | null;
  reason?: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface SearchResponse {
  polls: PollWithCounts[];
  cursor: string | null;
  has_more: boolean;
  category_counts?: CategoryCount[];
}

export interface ExploreResponse {
  polls: PollWithCounts[];
  region?: string | null;
}

export interface DemographicGroup {
  label: string;
  yes: number;
  no: number;
  total: number;
  yes_pct: number;
}

export interface FullBreakdown {
  age: DemographicGroup[];
  region: DemographicGroup[];
  politics: DemographicGroup[];
  gender: DemographicGroup[];
}

export interface FeedResponse {
  polls: PollWithCounts[];
  cursor: string | null;
  has_more: boolean;
}

export interface CastVoteResponse {
  success: true;
  yes_count: number;
  no_count: number;
  total: number;
}

export interface DemographicBreakdownGroup {
  yes_pct: number;
  total: number;
}

export interface DemographicBreakdown {
  age: Record<string, DemographicBreakdownGroup>;
  region: Record<string, DemographicBreakdownGroup>;
  politics: Record<string, DemographicBreakdownGroup>;
  gender: Record<string, DemographicBreakdownGroup>;
}

export interface PublicComment {
  id: string;
  content: string;
  created_at: string;
  age_range: string | null;
  region_detail: string | null;
  political_lean: number | null;
  net_score?: number;
  up_count?: number;
  down_count?: number;
  user_opinion_vote?: 1 | -1 | null;
  pending?: boolean;
}

export interface UserDemographics {
  age_group: string | null;
  region: string | null;
  region_detail: string | null;
  politics_label: string | null;
  gender: string | null;
}

export interface PollDetailResponse {
  poll: DbPoll;
  yes_count: number;
  no_count: number;
  total_count: number;
  comment_count: number;
  user_vote: 1 | -1 | null;
  demographic_breakdown: DemographicBreakdown;
  full_breakdown: FullBreakdown;
  user_demographics: UserDemographics;
  comments: PublicComment[];
  has_commented: boolean;
  user_comment: string | null;
  comment_banned: boolean;
}

// ── Database helper type (for supabase client generics) ───────────────────

export interface Database {
  public: {
    Tables: {
      users: { Row: DbUser; Insert: Omit<DbUser, "comment_strikes" | "comment_banned" | "created_at" | "last_active_at">; Update: Partial<DbUser> };
      polls: { Row: DbPoll; Insert: Omit<DbPoll, "id" | "upvote_count" | "created_at">; Update: Partial<DbPoll> };
      votes: { Row: DbVote; Insert: Omit<DbVote, "id" | "created_at">; Update: never };
      vote_counts: { Row: DbVoteCount; Insert: DbVoteCount; Update: Partial<DbVoteCount> };
      comments: { Row: DbComment; Insert: Omit<DbComment, "id" | "created_at">; Update: Partial<DbComment> };
      comment_flags: { Row: DbCommentFlag; Insert: Omit<DbCommentFlag, "id" | "created_at">; Update: never };
      poll_upvotes: { Row: DbPollUpvote; Insert: Omit<DbPollUpvote, "created_at">; Update: never };
      user_insights: { Row: DbUserInsight; Insert: DbUserInsight; Update: Partial<DbUserInsight> };
    };
  };
}
