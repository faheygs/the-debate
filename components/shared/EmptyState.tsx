import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  heading: string;
  subtext?: string;
}

export function EmptyState({ icon = 'flame-outline', heading, subtext }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textTertiary} />
      <Text style={[styles.heading, { color: colors.text }]}>{heading}</Text>
      {subtext && (
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>{subtext}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 17,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
