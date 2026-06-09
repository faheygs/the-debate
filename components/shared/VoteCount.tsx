import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import { formatVoteCount } from '@/lib/utils';
export { formatVoteCount };

interface Props {
  total: number;
  velocity?: number;
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
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
