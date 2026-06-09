import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { PoliticsSlider } from '@/components/onboarding/PoliticsSlider';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function PoliticsScreen() {
  const colors = useColors();
  const { data, set } = useOnboarding();
  const [value, setValue] = useState<number | null>(
    data.political_lean !== undefined ? data.political_lean : null,
  );

  function handleContinue() {
    if (value === null) return;
    set({ political_lean: value });
    router.push('/(auth)/onboarding/income');
  }

  function handleSkip() {
    set({ political_lean: null });
    router.push('/(auth)/onboarding/income');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={4} total={7} />

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Political lean?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Where you place yourself on the political spectrum.
          </Text>
        </View>

        <PoliticsSlider value={value} onChange={setValue} />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: value !== null ? colors.accent : colors.surfaceAlt }]}
            onPress={handleContinue}
            disabled={value === null}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: value !== null ? colors.accentText : colors.textTertiary }]}>
              Continue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
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
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 22 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  footer: { marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 24, gap: 8, alignItems: 'center' },
  button: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  skip: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
});
