export interface CategoryMeta {
  key: string;
  label: string;
  dotColor: string;
  lightBg: string;
  lightText: string;
  darkBg: string;
  darkText: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'politics',      label: 'Politics',      dotColor: '#4338CA', lightBg: '#EEF2FF', lightText: '#4338CA', darkBg: '#1E1B4B', darkText: '#A5B4FC' },
  { key: 'culture',       label: 'Culture',       dotColor: '#7C3AED', lightBg: '#F5F3FF', lightText: '#7C3AED', darkBg: '#2E1065', darkText: '#C4B5FD' },
  { key: 'food',          label: 'Food',          dotColor: '#991B1B', lightBg: '#FEE2E2', lightText: '#991B1B', darkBg: '#450A0A', darkText: '#FCA5A5' },
  { key: 'ethics',        label: 'Ethics',        dotColor: '#92400E', lightBg: '#FFFBEB', lightText: '#92400E', darkBg: '#2D1B00', darkText: '#FCD34D' },
  { key: 'sports',        label: 'Sports',        dotColor: '#166534', lightBg: '#F0FDF4', lightText: '#166534', darkBg: '#052E16', darkText: '#6EE7B7' },
  { key: 'tech',          label: 'Tech',          dotColor: '#1D4ED8', lightBg: '#EFF6FF', lightText: '#1D4ED8', darkBg: '#0C1A3B', darkText: '#93C5FD' },
  { key: 'relationships', label: 'Relationships', dotColor: '#9D174D', lightBg: '#FDF2F8', lightText: '#9D174D', darkBg: '#4A0D2E', darkText: '#F9A8D4' },
  { key: 'hypothetical',  label: 'Hypothetical',  dotColor: '#0F766E', lightBg: '#F0FDFA', lightText: '#0F766E', darkBg: '#021716', darkText: '#5EEAD4' },
  { key: 'news',          label: 'News',          dotColor: '#374151', lightBg: '#F9FAFB', lightText: '#374151', darkBg: '#111827', darkText: '#9CA3AF' },
  { key: 'entertainment', label: 'Entertainment', dotColor: '#9A3412', lightBg: '#FFF7ED', lightText: '#9A3412', darkBg: '#431407', darkText: '#FDBA74' },
  { key: 'other',         label: 'Other',         dotColor: '#6B7280', lightBg: '#F3F4F6', lightText: '#6B7280', darkBg: '#1F2937', darkText: '#9CA3AF' },
];

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c]),
);
