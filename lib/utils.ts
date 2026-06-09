export function formatVoteCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return null;
  const minutes = Math.floor(msLeft / (1000 * 60));
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  if (minutes < 60) return `Closes in ${minutes}m`;
  if (hours < 24) return `Closes in ${hours}h`;
  if (days < 7) return `Closes in ${days}d`;
  return null;
}

export function generateInsight(yesPct: number, total: number, userVote: 1 | -1): string {
  if (total < 10) return "Not enough votes yet to draw conclusions.";
  if (yesPct === 50) return "This one's perfectly split.";
  if (userVote === 1 && yesPct > 66) return "The majority agrees with you.";
  if (userVote === 1 && yesPct < 34) return "You're in the minority on this one.";
  if (userVote === -1 && yesPct < 34) return "The majority agrees with you.";
  if (userVote === -1 && yesPct > 66) return "You're in the minority on this one.";
  return "It's contested — people are split on this.";
}

export function pluralize(n: number, word: string): string {
  return n === 1 ? `1 ${word}` : `${formatVoteCount(n)} ${word}s`;
}

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington D.C.',
}

export const getStateName = (code: string) => STATE_NAMES[code?.toUpperCase()] ?? code

export function formatGroupLabel(dim: string, value: string): string {
  if (dim === 'gender') {
    if (value === 'male') return 'Male';
    if (value === 'female') return 'Female';
    if (value === 'nonbinary') return 'Non-binary';
    if (value === 'prefer_not' || value === 'prefer_not_to_say') return 'Prefer not to say';
  }
  if (dim === 'politics') {
    const n = Number(value);
    if (!isNaN(n)) {
      if (n <= -2) return 'Very Liberal';
      if (n === -1) return 'Liberal';
      if (n === 0) return 'Moderate';
      if (n === 1) return 'Conservative';
      return 'Very Conservative';
    }
  }
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

const LEAN_LABELS = ['Very Liberal', 'Liberal', 'Moderate', 'Conservative', 'Very Conservative'];

export function formatAttribution(
  ageRange: string | null,
  regionDetail: string | null,
  politicalLean: number | null,
): string {
  const parts: string[] = [];
  if (ageRange) parts.push(ageRange);
  if (regionDetail) parts.push(regionDetail);
  if (politicalLean !== null) {
    const label = LEAN_LABELS[politicalLean + 2] ?? 'Moderate';
    parts.push(label);
  }
  return parts.join(' · ');
}
