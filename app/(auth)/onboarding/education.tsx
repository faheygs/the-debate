import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { OptionGrid } from '@/components/onboarding/OptionGrid';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';

const EDUCATION_OPTIONS = [
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'graduate', label: 'Graduate' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function EducationScreen() {
  const colors = useColors();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={6} total={7} />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Education level?</Text>
            <Text style={[styles.optional, { color: colors.textTertiary }]}>(Optional)</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Helps reveal how education shapes opinions.
          </Text>
        </View>

        <OptionGrid options={EDUCATION_OPTIONS} selected={selected} onSelect={setSelected} columns={2} />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: colors.accentText }]}>Continue</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 22 },
  optional: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  footer: { marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 24, gap: 8, alignItems: 'center' },
  button: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  skip: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
});
