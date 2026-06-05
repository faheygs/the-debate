import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

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
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]} />
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
                    backgroundColor: active ? '#208AEF' : theme.backgroundElement,
                    borderColor: active ? '#208AEF' : theme.backgroundSelected,
                  },
                ]}
              />
              <ThemedText
                type="small"
                style={[
                  styles.label,
                  { color: active ? '#208AEF' : theme.textSecondary },
                  active && styles.labelActive,
                ]}
              >
                {stop.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  track: {
    position: 'absolute',
    left: Spacing.four + 16,
    right: Spacing.four + 16,
    height: 2,
    top: Spacing.three + 15,
    borderRadius: 1,
  },
  stops: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stopWrapper: {
    alignItems: 'center',
    gap: Spacing.two,
    width: 58,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  labelActive: {
    fontWeight: '700',
  },
});
