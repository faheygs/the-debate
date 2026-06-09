import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { OptionGrid } from '@/components/onboarding/OptionGrid';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';

const INCOME_OPTIONS = [
  { value: 'under_30k', label: 'Under $30k' },
  { value: '30-60k', label: '$30k – $60k' },
  { value: '60-100k', label: '$60k – $100k' },
  { value: '100-150k', label: '$100k – $150k' },
  { value: '150k+', label: '$150k+' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function IncomeScreen() {
  const colors = useColors();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={5} total={7} />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Income bracket?</Text>
            <Text style={[styles.optional, { color: colors.textTertiary }]}>(Optional)</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Helps show how income affects opinions.
          </Text>
        </View>

        <OptionGrid options={INCOME_OPTIONS} selected={selected} onSelect={setSelected} columns={2} />

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
