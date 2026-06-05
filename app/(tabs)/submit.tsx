import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/constants/colors';
import { Spacing } from '@/constants/theme';
import type { PollType } from '@/types/app';

const CATEGORIES = [
  'politics', 'culture', 'food', 'ethics', 'sports',
  'tech', 'relationships', 'hypothetical', 'news', 'entertainment',
];

const POLL_TYPES: { value: PollType; label: string; description: string }[] = [
  { value: 'binary', label: 'Agree / Disagree', description: 'Classic yes or no' },
  { value: 'versus', label: 'Would You Rather', description: 'Two custom options' },
  { value: 'scale', label: '1–5 Scale', description: 'Rate on a spectrum' },
];

const MAX_CHARS = 150;
const MAX_OPTION_CHARS = 60;

export default function SubmitScreen() {
  const colors = useColors();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [pollType, setPollType] = useState<PollType>('binary');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');

  const charsLeft = MAX_CHARS - question.length;
  const isVersus = pollType === 'versus';

  const canSubmit =
    question.trim().length > 0 &&
    category !== null &&
    (!isVersus || (optionA.trim().length > 0 && optionB.trim().length > 0));

  function handleSubmit() {
    // Edge function call goes here in Phase 7
    console.log('[submit] Submitting poll:', { question, category, pollType, optionA, optionB });
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleRow}>
              <ThemedText style={[styles.screenTitle, { color: colors.text }]}>
                Submit a Debate
              </ThemedText>
              <ThemedText style={[styles.note, { color: colors.textTertiary }]}>
                Goes to community review before going live
              </ThemedText>
            </View>

            {/* Question input */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                Question
              </ThemedText>
              <TextInput
                style={[
                  styles.questionInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: question.length > MAX_CHARS ? colors.disagree : colors.border,
                  },
                ]}
                placeholder="Ask the world anything..."
                placeholderTextColor={colors.textTertiary}
                value={question}
                onChangeText={t => setQuestion(t.slice(0, MAX_CHARS + 10))}
                multiline
                returnKeyType="done"
                blurOnSubmit
              />
              <ThemedText
                style={[
                  styles.charCount,
                  { color: charsLeft < 20 ? colors.disagree : colors.textTertiary },
                ]}
              >
                {charsLeft} characters left
              </ThemedText>
            </View>

            {/* Poll type */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                Poll Type
              </ThemedText>
              <View style={styles.typeRow}>
                {POLL_TYPES.map(pt => {
                  const active = pollType === pt.value;
                  return (
                    <TouchableOpacity
                      key={pt.value}
                      style={[
                        styles.typeBtn,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setPollType(pt.value)}
                      activeOpacity={0.75}
                    >
                      <ThemedText
                        style={[
                          styles.typeBtnLabel,
                          { color: active ? '#fff' : colors.text },
                        ]}
                      >
                        {pt.label}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.typeBtnDesc,
                          { color: active ? 'rgba(255,255,255,0.75)' : colors.textTertiary },
                        ]}
                      >
                        {pt.description}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Versus option labels — only shown when poll_type = 'versus' */}
            {isVersus && (
              <View style={styles.section}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  Options
                </ThemedText>
                <View style={styles.versusRow}>
                  <View style={styles.versusField}>
                    <ThemedText style={[styles.versusFieldLabel, { color: colors.agreeText }]}>
                      Option A
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.versusInput,
                        {
                          backgroundColor: colors.agreeLight,
                          color: colors.text,
                          borderColor: optionA ? colors.agreeBorder : colors.border,
                        },
                      ]}
                      placeholder="e.g. Be invisible"
                      placeholderTextColor={colors.textTertiary}
                      value={optionA}
                      onChangeText={t => setOptionA(t.slice(0, MAX_OPTION_CHARS))}
                      returnKeyType="next"
                    />
                    <ThemedText style={[styles.charCount, { color: colors.textTertiary }]}>
                      {MAX_OPTION_CHARS - optionA.length} left
                    </ThemedText>
                  </View>

                  <View style={styles.versusField}>
                    <ThemedText style={[styles.versusFieldLabel, { color: colors.disagreeText }]}>
                      Option B
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.versusInput,
                        {
                          backgroundColor: colors.disagreeLight,
                          color: colors.text,
                          borderColor: optionB ? colors.disagreeBorder : colors.border,
                        },
                      ]}
                      placeholder="e.g. Be able to fly"
                      placeholderTextColor={colors.textTertiary}
                      value={optionB}
                      onChangeText={t => setOptionB(t.slice(0, MAX_OPTION_CHARS))}
                      returnKeyType="done"
                    />
                    <ThemedText style={[styles.charCount, { color: colors.textTertiary }]}>
                      {MAX_OPTION_CHARS - optionB.length} left
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Category picker */}
            <View style={styles.section}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                Category
              </ThemedText>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryBtn,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <ThemedText
                        style={[
                          styles.categoryBtnText,
                          { color: active ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        {cat}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: canSubmit ? colors.primary : colors.surfaceAlt },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <ThemedText
                style={[
                  styles.submitBtnText,
                  { color: canSubmit ? '#fff' : colors.textTertiary },
                ]}
              >
                Submit for Review
              </ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  titleRow: { gap: 4 },
  screenTitle: { fontSize: 24, fontWeight: '700' },
  note: { fontSize: 13 },
  section: { gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '500' },
  questionInput: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, textAlign: 'right' },
  typeRow: { gap: Spacing.two },
  typeBtn: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 2,
  },
  typeBtnLabel: { fontSize: 14, fontWeight: '500' },
  typeBtnDesc: { fontSize: 12 },
  versusRow: { flexDirection: 'row', gap: Spacing.two },
  versusField: { flex: 1, gap: 4 },
  versusFieldLabel: { fontSize: 12, fontWeight: '500' },
  versusInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBtnText: { fontSize: 13, fontWeight: '500' },
  footer: {
    padding: Spacing.three,
    borderTopWidth: 0.5,
  },
  submitBtn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 15, fontWeight: '500' },
});
