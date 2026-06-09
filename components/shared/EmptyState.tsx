import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  heading: string;
  subtext?: string;
  button?: { label: string; onPress: () => void };
}

export function EmptyState({ icon = 'flame-outline', heading, subtext, button }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textTertiary} />
      <Text style={[styles.heading, { color: colors.text }]}>{heading}</Text>
      {subtext && (
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>{subtext}</Text>
      )}
      {button && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={button.onPress}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnLabel, { color: colors.accentText }]}>{button.label}</Text>
        </TouchableOpacity>
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
