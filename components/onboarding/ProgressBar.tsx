import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Props = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i < current ? '#208AEF' : theme.backgroundElement },
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});
