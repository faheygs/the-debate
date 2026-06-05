export type OnboardingData = {
  age_range: string | null;
  gender: string | null;
  region: string | null;
  region_detail: string | null;
  political_lean: number | null;
  income_bracket: string | null;
  education_level: string | null;
};

export type PollType = 'binary' | 'scale' | 'versus';

export type Poll = {
  id: string;
  question: string;
  category: string;
  poll_type: PollType;
  option_a: string | null;
  option_b: string | null;
  status: 'pending' | 'live' | 'closed' | 'rejected';
  upvote_count: number;
  is_evergreen: boolean;
  expires_at: string | null;
  created_at: string;
  promoted_at: string | null;
  closed_at: string | null;
  submitted_by: string | null;
};
