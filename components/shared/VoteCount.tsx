import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';

interface Props {
  total: number;
  velocity?: number;
}

export function formatVoteCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function VoteCount({ total, velocity }: Props) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const prevTotal = useRef(total);

  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.08, tension: 300, friction: 10, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [total]);

  const velText = velocity && velocity > 0 ? ` · +${formatVoteCount(velocity)}/hr` : '';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Text style={[styles.text, { color: colors.textTertiary }]}>
        {formatVoteCount(total)} votes{velText}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
});
