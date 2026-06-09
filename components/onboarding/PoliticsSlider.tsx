import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';

const STOPS = [
  { value: -2, label: 'Very\nLiberal' },
  { value: -1, label: 'Liberal' },
  { value: 0, label: 'Moderate' },
  { value: 1, label: 'Conservative' },
  { value: 2, label: 'Very\nConservative' },
];

type Props = {
  value: number | null;
  onChange: (value: number) => void;
};

export function PoliticsSlider({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]} />
      <View style={styles.stops}>
        {STOPS.map(stop => {
          const active = value === stop.value;
          return (
            <TouchableOpacity
              key={stop.value}
              style={styles.stopWrapper}
              onPress={() => onChange(stop.value)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.accent : colors.textSecondary },
                  active && styles.labelActive,
                ]}
              >
                {stop.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  track: {
    position: 'absolute',
    left: 32,
    right: 32,
    height: 2,
    top: 27,
    borderRadius: 1,
  },
  stops: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stopWrapper: {
    alignItems: 'center',
    gap: 8,
    width: 58,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  labelActive: {
    fontFamily: 'Inter_600SemiBold',
  },
});
