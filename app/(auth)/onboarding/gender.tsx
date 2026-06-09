import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { OptionGrid } from '@/components/onboarding/OptionGrid';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

export default function GenderScreen() {
  const colors = useColors();
  const { data, set } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(
    data.gender !== undefined ? (data.gender === null ? 'prefer_not' : data.gender) : null,
  );

  function handleContinue() {
    if (!selected) return;
    set({ gender: selected === 'prefer_not' ? null : selected });
    router.push('/(auth)/onboarding/region');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={2} total={7} />

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>How do you identify?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Used to show gender breakdowns in poll results.
          </Text>
        </View>

        <OptionGrid options={GENDER_OPTIONS} selected={selected} onSelect={setSelected} columns={2} />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: selected ? colors.accent : colors.surfaceAlt }]}
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
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 22 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  footer: { marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 24 },
  button: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
