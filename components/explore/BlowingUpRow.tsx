import { TouchableOpacity, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/constants/colors';
import type { PollWithCounts } from '@/types/database';

const AMBER = '#C8762A';

interface BlowingUpRowProps {
  poll: PollWithCounts;
  velocity: number;
}

export function BlowingUpRow({ poll, velocity }: BlowingUpRowProps) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';

  const rowBg = isDark ? '#161616' : colors.surface;
  const rowBorder = isDark ? '#252525' : colors.border;
  const chevronColor = isDark ? '#333333' : colors.borderMid;

  const hasVelocity = velocity > 0;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: rowBg, borderColor: rowBorder }]}
      onPress={() => router.push(`/poll/${poll.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={styles.iconBox}>
        <Ionicons name="flame-outline" size={18} color={AMBER} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.question, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
          {poll.question}
        </Text>
        <Text style={[styles.velocity, { color: hasVelocity ? AMBER : '#555555' }]}>
          {hasVelocity ? `+${velocity} votes this hour` : 'Gaining momentum'}
        </Text>
      </View>

      <Ionicons name="chevron-forward-outline" size={16} color={chevronColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(200, 118, 42, 0.4)',
    padding: 12,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(200, 118, 42, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200, 118, 42, 0.3)',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  question: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  velocity: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
});
