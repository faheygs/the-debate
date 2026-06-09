import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { OptionGrid } from '@/components/onboarding/OptionGrid';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';

const AGE_OPTIONS = [
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55-64', label: '55–64' },
  { value: '65+', label: '65+' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function AgeScreen() {
  const colors = useColors();
  const { data, set } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(
    data.age_range !== undefined ? (data.age_range === null ? 'prefer_not' : data.age_range) : null,
  );

  function handleContinue() {
    if (!selected) return;
    set({ age_range: selected === 'prefer_not' ? null : selected });
    router.push('/(auth)/onboarding/gender');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={1} total={7} />

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>How old are you?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Used to show how your age group votes.
          </Text>
        </View>

        <OptionGrid
          options={AGE_OPTIONS}
          selected={selected}
          onSelect={setSelected}
          columns={2}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: selected ? colors.accent : colors.surfaceAlt },
            ]}
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: selected ? colors.accentText : colors.textTertiary }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: 16 },
  content: { paddingHorizontal: 16, gap: 8 },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
