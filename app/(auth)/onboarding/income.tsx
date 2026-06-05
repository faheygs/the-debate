import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionGrid } from '@/components/onboarding/OptionGrid';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Spacing } from '@/constants/theme';

const INCOME_OPTIONS = [
  { value: 'under_30k', label: 'Under $30k' },
  { value: '30-60k', label: '$30k – $60k' },
  { value: '60-100k', label: '$60k – $100k' },
  { value: '100-150k', label: '$100k – $150k' },
  { value: '150k+', label: '$150k+' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function IncomeScreen() {
  const { data, set } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.income_bracket ?? null);

  function handleContinue() {
    set({ income_bracket: selected });
    router.push('/(auth)/onboarding/education');
  }

  function handleSkip() {
    set({ income_bracket: null });
    router.push('/(auth)/onboarding/education');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={5} total={7} />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle">Income bracket?</ThemedText>
            <ThemedText type="small" style={styles.optional}>(Optional)</ThemedText>
          </View>
          <ThemedText type="default" themeColor="textSecondary">
            Helps show how income affects opinions.
          </ThemedText>
        </View>

        <OptionGrid
          options={INCOME_OPTIONS}
          selected={selected}
          onSelect={setSelected}
          columns={2}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <ThemedText style={styles.buttonText}>Continue</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.skip}>
              Skip
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: Spacing.four },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  optional: { color: '#208AEF' },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  skip: { textAlign: 'center' },
});
