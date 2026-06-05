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
  const { data, set } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(
    data.age_range !== undefined ? (data.age_range === null ? 'prefer_not' : data.age_range) : null,
  );

  function handleContinue() {
    if (!selected) return;
    // 'prefer_not' stores null — user chose to skip this field
    set({ age_range: selected === 'prefer_not' ? null : selected });
    router.push('/(auth)/onboarding/gender');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={1} total={7} />

        <View style={styles.content}>
          <ThemedText type="subtitle">How old are you?</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Used to show how your age group votes.
          </ThemedText>
        </View>

        <OptionGrid
          options={AGE_OPTIONS}
          selected={selected}
          onSelect={setSelected}
          columns={2}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !selected && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <ThemedText style={styles.buttonText}>Continue</ThemedText>
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
  footer: {
    marginTop: 'auto',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
