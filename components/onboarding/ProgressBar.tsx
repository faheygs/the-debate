import { View, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';

type Props = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i < current ? colors.accent : colors.surfaceAlt },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});
