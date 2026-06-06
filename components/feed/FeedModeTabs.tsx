import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useColors } from '@/constants/colors';
import type { FeedMode } from '@/hooks/useFeed';

const MODES: { key: FeedMode; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'closest', label: 'Closest' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'for_you', label: 'For You' },
];

interface Props {
  active: FeedMode;
  onSelect: (mode: FeedMode) => void;
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
        {MODES.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onSelect(key)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                isActive
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: isActive ? '#fff' : colors.textSecondary },
                ]}
              >
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
    paddingVertical: 6,
    borderRadius: 99,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
});
