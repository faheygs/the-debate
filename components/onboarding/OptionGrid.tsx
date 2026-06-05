import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  selected: string | null;
  onSelect: (value: string) => void;
  columns?: 2 | 3;
};

export function OptionGrid({ options, selected, onSelect, columns = 2 }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {options.map(opt => {
        const active = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              columns === 3 ? styles.option3 : styles.option2,
              { backgroundColor: active ? '#208AEF' : theme.backgroundElement },
            ]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <ThemedText
              type="default"
              style={[styles.label, { color: active ? '#fff' : theme.text }]}
            >
              {opt.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  option: {
    minHeight: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  option2: { width: '47.5%' },
  option3: { width: '30.5%' },
  label: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
