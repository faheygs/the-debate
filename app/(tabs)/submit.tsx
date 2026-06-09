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
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { submitPoll } from '@/lib/api';
import { Toast } from '@/components/shared/Toast';

const CATEGORIES = [
  { key: 'politics',      label: 'Politics' },
  { key: 'culture',       label: 'Culture' },
  { key: 'food',          label: 'Food' },
  { key: 'ethics',        label: 'Ethics' },
  { key: 'sports',        label: 'Sports' },
  { key: 'tech',          label: 'Tech' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'hypothetical',  label: 'Hypothetical' },
  { key: 'news',          label: 'News' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'other',         label: 'Other' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const PRESETS = [
  { a: 'Agree',   b: 'Disagree' },
  { a: 'Yes',     b: 'No' },
  { a: 'True',    b: 'False' },
  { a: 'Support', b: 'Oppose' },
  { a: 'For',     b: 'Against' },
  { a: 'Custom',  b: '' },
] as const;

const MAX_CHARS = 150;
const MAX_TAGS = 5;
const MAX_OPTION = 20;
const AMBER = '#C8762A';
const AMBER_TEXT = '#FFF8F0';

function normalizeTag(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

export default function SubmitScreen() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [optionA, setOptionA] = useState('Agree');
  const [optionB, setOptionB] = useState('Disagree');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [questionFocused, setQuestionFocused] = useState(false);
  const [optAFocused, setOptAFocused] = useState(false);
  const [optBFocused, setOptBFocused] = useState(false);

  const isCustom = selectedPreset === PRESETS.length - 1;
  const charCount = question.length;
  const selectedCategory = category ? CATEGORIES.find(c => c.key === category) ?? null : null;

  // Preview values fall back to defaults when custom inputs are empty
  const previewA = optionA.trim() || 'Agree';
  const previewB = optionB.trim() || 'Disagree';

  const canSubmit =
    question.trim().length >= 10 &&
    charCount <= MAX_CHARS &&
    category !== null &&
    optionA.trim().length >= 1 &&
    optionB.trim().length >= 1;

  const charCountColor =
    charCount > 140 ? '#E57373' :
    charCount > 120 ? AMBER :
    '#555555';

  // Shared derived colors
  const inputBg     = isDark ? '#161616' : colors.surface;
  const inputBorder = isDark ? '#2A2A2A' : colors.border;
  const cardBg      = isDark ? '#161616' : colors.surface;
  const cardBorder  = isDark ? '#252525' : colors.border;

  function handlePresetSelect(index: number) {
    setSelectedPreset(index);
    if (index < PRESETS.length - 1) {
      setOptionA(PRESETS[index].a);
      setOptionB(PRESETS[index].b);
    } else {
      setOptionA('');
      setOptionB('');
    }
  }

  function addTag(raw: string) {
    const normalized = normalizeTag(raw.trim());
    if (!normalized || tags.includes(normalized) || tags.length >= MAX_TAGS) return;
    setTags(prev => [...prev, normalized]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  function handleTagInputChange(text: string) {
    if (text.endsWith(' ') || text.endsWith(',')) {
      addTag(text.slice(0, -1));
    } else {
      setTagInput(text);
    }
  }

  function resetForm() {
    setQuestion('');
    setCategory(null);
    setSelectedPreset(0);
    setOptionA('Agree');
    setOptionB('Disagree');
    setTags([]);
    setTagInput('');
  }

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const pollType = (optionA.trim() === 'Agree' && optionB.trim() === 'Disagree') ? 'binary' : 'versus';

    submitPoll(
      question.trim(),
      pollType,
      category!,
      pollType === 'versus' ? optionA.trim() : undefined,
      pollType === 'versus' ? optionB.trim() : undefined,
      tags.length > 0 ? tags : undefined,
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
            contentInsetAdjustmentBehavior="automatic"
          >
            {/* Header */}
            <View>
              <Text style={[styles.screenTitle, { color: isDark ? '#F5F5F5' : colors.text }]}>
                Start a Debate
              </Text>
              <Text style={styles.screenSubtitle}>Ask the world something.</Text>
            </View>

            {/* ── Live Preview Card ── */}
            <View>
            <View style={styles.previewLabelRow}>
              <View style={styles.previewDot} />
              <Text style={styles.previewLabel}>LIVE PREVIEW</Text>
            </View>
            <View style={[styles.previewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.previewCategoryChip, {
                backgroundColor: isDark ? '#1E1E1E' : colors.surfaceAlt,
                borderColor: isDark ? '#2A2A2A' : colors.border,
              }]}>
                <Text style={[styles.previewCategoryText, {
                  color: selectedCategory ? (isDark ? '#888888' : colors.textSecondary) : '#444444',
                }]}>
                  {selectedCategory ? selectedCategory.label : 'Category'}
                </Text>
              </View>

              {question.trim().length > 0 ? (
                <Text style={[styles.previewQuestion, { color: isDark ? '#F5F5F5' : colors.text }]}>
                  {question}
                </Text>
              ) : (
                <Text style={styles.previewQuestionEmpty}>
                  Your question will appear here...
                </Text>
              )}

              <View style={styles.previewBar} />

              <View style={styles.previewBtns}>
                <View style={[styles.previewBtn, {
                  backgroundColor: isDark ? '#1E1E1E' : colors.surfaceAlt,
                  borderColor: isDark ? '#2A2A2A' : colors.border,
                }]}>
                  <Text style={[styles.previewBtnText, { color: isDark ? '#555555' : colors.textTertiary }]} numberOfLines={1}>
                    {previewA}
                  </Text>
                </View>
                <View style={[styles.previewBtn, {
                  backgroundColor: isDark ? '#1E1E1E' : colors.surfaceAlt,
                  borderColor: isDark ? '#2A2A2A' : colors.border,
                }]}>
                  <Text style={[styles.previewBtnText, { color: isDark ? '#555555' : colors.textTertiary }]} numberOfLines={1}>
                    {previewB}
                  </Text>
                </View>
              </View>

              <Text style={styles.previewMeta}>Be the first to vote</Text>
            </View>
            </View>

            {/* ── Question Input ── */}
            <View>
              <TextInput
                style={[
                  styles.questionInput,
                  {
                    backgroundColor: inputBg,
                    color: isDark ? '#F5F5F5' : colors.text,
                    borderColor: questionFocused ? AMBER : inputBorder,
                  },
                ]}
                placeholder="Ask the world something..."
                placeholderTextColor="#333333"
                value={question}
                onChangeText={setQuestion}
                onFocus={() => setQuestionFocused(true)}
                onBlur={() => setQuestionFocused(false)}
                multiline
                returnKeyType="done"
                blurOnSubmit
              />
              <Text style={[styles.charCounter, { color: charCountColor }]}>
                {charCount} / {MAX_CHARS}
              </Text>
            </View>

            {/* ── How will people vote? ── */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#F5F5F5' : colors.text }]}>
                  How will people vote?
                </Text>
                <Text style={styles.sectionSubtitle}>Choose or customize the vote buttons</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}
              >
                {PRESETS.map((preset, i) => {
                  const active = selectedPreset === i;
                  const label = i === PRESETS.length - 1 ? 'Custom' : `${preset.a} / ${preset.b}`;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.presetPill,
                        active
                          ? styles.presetPillActive
                          : styles.presetPillInactive,
                      ]}
                      onPress={() => handlePresetSelect(i)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.presetPillText,
                        { color: active ? AMBER_TEXT : '#666666', fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' },
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {isCustom && (
                <View style={styles.customRow}>
                  <TextInput
                    style={[
                      styles.customInput,
                      {
                        backgroundColor: inputBg,
                        color: isDark ? '#F5F5F5' : colors.text,
                        borderColor: optAFocused ? AMBER : inputBorder,
                      },
                    ]}
                    placeholder="Yes"
                    placeholderTextColor="#333333"
                    value={optionA}
                    onChangeText={t => setOptionA(t.slice(0, MAX_OPTION))}
                    onFocus={() => setOptAFocused(true)}
                    onBlur={() => setOptAFocused(false)}
                    returnKeyType="next"
                  />
                  <Text style={styles.customSep}>/</Text>
                  <TextInput
                    style={[
                      styles.customInput,
                      {
                        backgroundColor: inputBg,
                        color: isDark ? '#F5F5F5' : colors.text,
                        borderColor: optBFocused ? AMBER : inputBorder,
                      },
                    ]}
                    placeholder="No"
                    placeholderTextColor="#333333"
                    value={optionB}
                    onChangeText={t => setOptionB(t.slice(0, MAX_OPTION))}
                    onFocus={() => setOptBFocused(true)}
                    onBlur={() => setOptBFocused(false)}
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>

            {/* ── Category ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#F5F5F5' : colors.text }]}>
                Category
              </Text>
              <TouchableOpacity
                style={[
                  styles.categorySelector,
                  {
                    backgroundColor: inputBg,
                    borderColor: selectedCategory ? AMBER : inputBorder,
                  },
                ]}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.categorySelectorText,
                  {
                    color: selectedCategory ? (isDark ? '#F5F5F5' : colors.text) : '#333333',
                    fontFamily: selectedCategory ? 'Inter_500Medium' : 'Inter_400Regular',
                  },
                ]}>
                  {selectedCategory ? selectedCategory.label : 'Select a category...'}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="#555555" />
              </TouchableOpacity>
            </View>

            {/* ── Tags ── */}
            <View style={styles.section}>
              <View style={styles.tagHeadRow}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#F5F5F5' : colors.text }]}>Tags</Text>
                <Text style={styles.tagCount}>{tags.length}/{MAX_TAGS}</Text>
              </View>

              {tags.length > 0 && (
                <View style={styles.tagPills}>
                  {tags.map(tag => (
                    <TouchableOpacity key={tag} style={styles.tagPill} onPress={() => removeTag(tag)} activeOpacity={0.75}>
                      <Text style={styles.tagPillText}>#{tag}</Text>
                      <Text style={styles.tagPillRemove}>×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {tags.length < MAX_TAGS && (
                <TextInput
                  style={[styles.tagInput, { backgroundColor: inputBg, borderColor: inputBorder, color: isDark ? '#F5F5F5' : colors.text }]}
                  placeholder="Add a tag..."
                  placeholderTextColor="#333333"
                  value={tagInput}
                  onChangeText={handleTagInputChange}
                  onSubmitEditing={() => { if (tagInput.trim()) addTag(tagInput); }}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              <Text style={styles.tagHint}>Press space or comma to add · tap to remove</Text>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: canSubmit ? AMBER : '#1E1E1E' }]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={AMBER_TEXT} size="small" />
              ) : (
                <Text style={[styles.submitBtnText, { color: canSubmit ? AMBER_TEXT : '#444444' }]}>
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Category picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)} />
        <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111111' : colors.background, paddingBottom: 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#333333' : colors.border }]} />
          <FlatList
            data={CATEGORIES}
            keyExtractor={item => item.key}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = category === item.key;
              return (
                <TouchableOpacity
                  style={[styles.sheetItem, { borderBottomColor: isDark ? '#1A1A1A' : colors.border }]}
                  onPress={() => { setCategory(item.key); setPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sheetItemText, { color: isDark ? '#F5F5F5' : colors.text }]}>
                    {item.label}
                  </Text>
                  {active && <Ionicons name="checkmark-outline" size={18} color={AMBER} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

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
    paddingBottom: 32,
    gap: 24,
  },

  // Header
  screenTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#555555',
    marginTop: 4,
  },

  // Preview label
  previewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  previewDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#C8762A',
  },
  previewLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#555555',
  },

  // Preview Card
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  previewCategoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewCategoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  previewQuestion: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  previewQuestionEmpty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    fontStyle: 'italic',
    color: '#333333',
    lineHeight: 20,
  },
  previewBar: {
    height: 5,
    borderRadius: 99,
    backgroundColor: '#252525',
  },
  previewBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  previewBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  previewMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#444444',
  },

  // Question input
  questionInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    paddingHorizontal: 16,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },

  // Section
  section: { gap: 10 },
  sectionHead: { gap: 2 },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#555555',
  },

  // Preset pills
  presetsRow: { gap: 8, paddingRight: 4 },
  presetPill: {
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  presetPillActive: {
    backgroundColor: AMBER,
  },
  presetPillInactive: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  presetPillText: {
    fontSize: 12,
  },

  // Custom inputs
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  customSep: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#555555',
    marginHorizontal: 8,
  },

  // Category selector
  categorySelector: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  categorySelectorText: {
    fontSize: 14,
    flex: 1,
  },

  // Tags
  tagHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#555555',
  },
  tagPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#888888',
  },
  tagPillRemove: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#555555',
    lineHeight: 16,
  },
  tagInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  tagHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#444444',
  },

  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetItemText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    flex: 1,
  },
});
