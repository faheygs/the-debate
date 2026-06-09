import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';

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
  const colors = useColors();

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
              {
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
                borderColor: active ? colors.accent : colors.border,
              },
            ]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.label, { color: active ? colors.accentText : colors.text }]}>
              {opt.label}
            </Text>
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
    gap: 8,
    paddingHorizontal: 16,
  },
  option: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  option2: { width: '47.5%' },
  option3: { width: '30.5%' },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
});
