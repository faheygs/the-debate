import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useColors } from '@/constants/colors';

type Variant = 'success' | 'error' | 'info';

interface Props {
  message: string;
  variant?: Variant;
  duration?: number;
  visible: boolean;
  onDismiss: () => void;
}

export function Toast({ message, variant = 'info', duration = 3000, visible, onDismiss }: Props) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 180, friction: 22, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 60, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, duration);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, message]);

  const bgColor =
    variant === 'success' ? colors.accent :
    variant === 'error' ? colors.accentDark :
    colors.surfaceAlt;

  const textColor =
    variant === 'success' || variant === 'error' ? colors.accentText : colors.text;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor: colors.border, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 10,
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
});
