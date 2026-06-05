export type OnboardingData = {
  age_range: string;
  gender: string | null;
  region: string;
  region_detail: string | null;
  political_lean: number;
  income_bracket: string | null;
  education_level: string | null;
};

export type SeedPoll = {
  question: string;
  category: string;
};
