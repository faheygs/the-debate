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

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function GenderScreen() {
  const { data, set } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(
    data.gender !== undefined ? (data.gender === null ? 'prefer_not' : data.gender) : null,
  );

  function handleContinue() {
    if (!selected) return;
    // 'prefer_not' stores null — user chose to skip this field
    set({ gender: selected === 'prefer_not' ? null : selected });
    router.push('/(auth)/onboarding/region');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={2} total={7} />

        <View style={styles.content}>
          <ThemedText type="subtitle">How do you identify?</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Used to show gender breakdowns in poll results.
          </ThemedText>
        </View>

        <OptionGrid
          options={GENDER_OPTIONS}
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
