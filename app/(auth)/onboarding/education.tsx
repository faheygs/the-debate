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

const EDUCATION_OPTIONS = [
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'graduate', label: 'Graduate' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function EducationScreen() {
  const { data, set } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.education_level ?? null);

  function handleContinue() {
    set({ education_level: selected });
    router.push('/(auth)/onboarding/complete');
  }

  function handleSkip() {
    set({ education_level: null });
    router.push('/(auth)/onboarding/complete');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={6} total={7} />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle">Education level?</ThemedText>
            <ThemedText type="small" style={styles.optional}>(Optional)</ThemedText>
          </View>
          <ThemedText type="default" themeColor="textSecondary">
            Helps reveal how education shapes opinions.
          </ThemedText>
        </View>

        <OptionGrid
          options={EDUCATION_OPTIONS}
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
