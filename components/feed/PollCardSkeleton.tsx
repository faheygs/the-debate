import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';

function ShimmerBox({ style }: { style: object }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[{ backgroundColor: colors.surfaceAlt, opacity }, style]}
    />
  );
}

export function PollCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <ShimmerBox style={styles.badge} />
        <ShimmerBox style={styles.statusBadge} />
      </View>
      <ShimmerBox style={styles.questionLine1} />
      <ShimmerBox style={styles.questionLine2} />
      <ShimmerBox style={styles.bar} />
      <View style={styles.buttons}>
        <ShimmerBox style={styles.button} />
        <ShimmerBox style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { width: 60, height: 18, borderRadius: 4 },
  statusBadge: { width: 70, height: 18, borderRadius: 4 },
  questionLine1: { height: 14, borderRadius: 4, width: '100%' },
  questionLine2: { height: 14, borderRadius: 4, width: '75%' },
  bar: { height: 6, borderRadius: 99, width: '100%' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, height: 44, borderRadius: 8 },
});
