import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PoliticsSlider } from '@/components/onboarding/PoliticsSlider';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Spacing } from '@/constants/theme';

export default function PoliticsScreen() {
  const { data, set } = useOnboarding();
  const [value, setValue] = useState<number | null>(
    data.political_lean !== undefined ? data.political_lean : null,
  );

  function handleContinue() {
    if (value === null) return;
    set({ political_lean: value });
    router.push('/(auth)/onboarding/income');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={4} total={7} />

        <View style={styles.content}>
          <ThemedText type="subtitle">Political lean?</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Where you place yourself on the political spectrum.
          </ThemedText>
        </View>

        <PoliticsSlider value={value} onChange={setValue} />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, value === null && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={value === null}
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
