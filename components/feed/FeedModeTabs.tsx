import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useColors } from '@/constants/colors';
import type { FeedFilter } from '@/hooks/useFeed';

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'for_you',       label: 'For You' },
  { key: 'timed',         label: 'Timed' },
  { key: 'politics',      label: 'Politics' },
  { key: 'culture',       label: 'Culture' },
  { key: 'food',          label: 'Food' },
  { key: 'ethics',        label: 'Ethics' },
  { key: 'sports',        label: 'Sports' },
  { key: 'tech',          label: 'Tech' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'hypothetical',  label: 'Hypothetical' },
  { key: 'news',          label: 'News' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'other',         label: 'Other' },
  { key: 'review',        label: 'In Review' },
];

interface Props {
  active: FeedFilter;
  onSelect: (filter: FeedFilter) => void;
}

export function FeedModeTabs({ active, onSelect }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.wrapper, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FILTERS.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onSelect(key)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: colors.accent }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 0.5 },
              ]}
            >
              <Text style={[styles.label, { color: isActive ? colors.accentText : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 0.5,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
