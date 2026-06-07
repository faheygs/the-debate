import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { submitPoll } from '@/lib/api';
import { Toast } from '@/components/shared/Toast';
import type { PollType } from '@/types/app';

const CATEGORIES = [
  { key: 'politics',      label: 'Politics',      color: '#4338CA' },
  { key: 'culture',       label: 'Culture',       color: '#7C3AED' },
  { key: 'food',          label: 'Food',          color: '#991B1B' },
  { key: 'ethics',        label: 'Ethics',        color: '#92400E' },
  { key: 'sports',        label: 'Sports',        color: '#166534' },
  { key: 'tech',          label: 'Tech',          color: '#1D4ED8' },
  { key: 'relationships', label: 'Relationships', color: '#9D174D' },
  { key: 'hypothetical',  label: 'Hypothetical',  color: '#0F766E' },
  { key: 'news',          label: 'News',          color: '#374151' },
  { key: 'entertainment', label: 'Entertainment', color: '#9A3412' },
  { key: 'other',         label: 'Other',         color: '#6B7280' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const POLL_TYPES: { value: Extract<PollType, 'binary' | 'versus'>; label: string }[] = [
  { value: 'binary', label: 'Agree / Disagree' },
  { value: 'versus', label: 'Would You Rather' },
];

const MAX_CHARS = 150;
const MAX_OPTION_CHARS = 50;

export default function SubmitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [pollType, setPollType] = useState<'binary' | 'versus'>('binary');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const isVersus = pollType === 'versus';
  const charCount = question.length;
  const charOverLimit = charCount > MAX_CHARS;

  const selectedCategory = category ? CATEGORIES.find(c => c.key === category) ?? null : null;

  const canSubmit =
    question.trim().length >= 10 &&
    !charOverLimit &&
    category !== null &&
    (!isVersus || (optionA.trim().length > 0 && optionB.trim().length > 0));

  function resetForm() {
    setQuestion('');
    setCategory(null);
    setPollType('binary');
    setOptionA('');
    setOptionB('');
  }

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    submitPoll(
      question.trim(),
      pollType,
      category!,
      isVersus ? optionA.trim() : undefined,
      isVersus ? optionB.trim() : undefined,
    ).then(() => {
      setSubmitting(false);
      resetForm();
      setToast({ message: 'Your debate is live!', variant: 'success' });
    }).catch((err: unknown) => {
      setSubmitting(false);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to submit. Please try again.',
        variant: 'error',
      });
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {/* Header */}
            <View style={styles.titleRow}>
              <Text style={[styles.screenTitle, { color: colors.text }]}>Start a Debate</Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                Ask the world a question and see how it votes
              </Text>
            </View>

            {/* Question input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Question</Text>
              <TextInput
                style={[
                  styles.questionInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: charOverLimit ? colors.disagree : colors.border,
                    fontFamily: 'Syne_700Bold',
                  },
                ]}
                placeholder="Ask the world something..."
                placeholderTextColor={colors.textTertiary}
                value={question}
                onChangeText={setQuestion}
                multiline
                returnKeyType="done"
                blurOnSubmit
              />
              <Text
                style={[
                  styles.charCount,
                  { color: charCount > 130 ? colors.disagree : colors.textTertiary },
                ]}
              >
                {charCount} / {MAX_CHARS}
              </Text>
            </View>

            {/* Poll type — two options in a row */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Poll Type</Text>
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
                      <Text
                        style={[
                          styles.typeBtnLabel,
                          { color: active ? '#fff' : colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {pt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Versus options */}
            {isVersus && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Options</Text>
                <View style={styles.versusRow}>
                  <View style={styles.versusField}>
                    <Text style={[styles.versusFieldLabel, { color: colors.agreeText }]}>Option A</Text>
                    <TextInput
                      style={[
                        styles.versusInput,
                        {
                          backgroundColor: colors.agreeLight,
                          color: colors.text,
                          borderColor: optionA ? colors.agreeBorder : colors.border,
                        },
                      ]}
                      placeholder="Option A..."
                      placeholderTextColor={colors.textTertiary}
                      value={optionA}
                      onChangeText={t => setOptionA(t.slice(0, MAX_OPTION_CHARS))}
                      returnKeyType="next"
                    />
                    <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                      {optionA.length} / {MAX_OPTION_CHARS}
                    </Text>
                  </View>
                  <View style={styles.versusField}>
                    <Text style={[styles.versusFieldLabel, { color: colors.disagreeText }]}>Option B</Text>
                    <TextInput
                      style={[
                        styles.versusInput,
                        {
                          backgroundColor: colors.disagreeLight,
                          color: colors.text,
                          borderColor: optionB ? colors.disagreeBorder : colors.border,
                        },
                      ]}
                      placeholder="Option B..."
                      placeholderTextColor={colors.textTertiary}
                      value={optionB}
                      onChangeText={t => setOptionB(t.slice(0, MAX_OPTION_CHARS))}
                      returnKeyType="done"
                    />
                    <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                      {optionB.length} / {MAX_OPTION_CHARS}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Category picker */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={[
                  styles.categorySelector,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selectedCategory ? selectedCategory.color : colors.border,
                    borderWidth: selectedCategory ? 1.5 : 1,
                  },
                ]}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.75}
              >
                <View style={styles.categorySelectorInner}>
                  {selectedCategory && (
                    <View style={[styles.colorDot, { backgroundColor: selectedCategory.color }]} />
                  )}
                  <Text
                    style={[
                      styles.categorySelectorText,
                      { color: selectedCategory ? colors.text : colors.textTertiary },
                    ]}
                  >
                    {selectedCategory ? selectedCategory.label : 'Select a category...'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={selectedCategory ? selectedCategory.color : colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Submit button */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: canSubmit ? colors.primary : colors.surfaceAlt },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={[
                    styles.submitBtnText,
                    { color: canSubmit ? '#fff' : colors.textTertiary },
                  ]}
                >
                  Submit for Review
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Category picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Sheet handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Choose a Category</Text>
          <FlatList
            data={CATEGORIES}
            keyExtractor={item => item.key}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = category === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.sheetItem,
                    {
                      backgroundColor: active ? colors.surfaceAlt : 'transparent',
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setCategory(item.key);
                    setPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.sheetItemText, { color: colors.text }]}>{item.label}</Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={item.color} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          visible={!!toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 32,
  },
  titleRow: { gap: 4 },
  screenTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 24,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  section: { gap: 8 },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  questionInput: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'right',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  typeBtnLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  versusRow: { flexDirection: 'row', gap: 8 },
  versusField: { flex: 1, gap: 4 },
  versusFieldLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  versusInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  // Category selector button
  categorySelector: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categorySelectorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categorySelectorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  footer: {
    padding: 16,
    borderTopWidth: 0.5,
  },
  submitBtn: {
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  // Modal sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 17,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sheetItemText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    flex: 1,
  },
});
