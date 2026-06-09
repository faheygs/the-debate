import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Toast } from '@/components/shared/Toast';
import { formatGroupLabel, getStateName, STATE_NAMES } from '@/lib/utils';

const AMBER = '#C8762A';

const ALL_STATES = Object.entries(STATE_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const AGE_OPTIONS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];
const POLITICS_OPTIONS = [
  { value: -2, label: 'Very Liberal' },
  { value: -1, label: 'Liberal' },
  { value: 0, label: 'Moderate' },
  { value: 1, label: 'Conservative' },
  { value: 2, label: 'Very Conservative' },
];
const INCOME_OPTIONS = [
  { value: 'under_30k', label: 'Under $30k' },
  { value: '30-60k', label: '$30–60k' },
  { value: '60-100k', label: '$60–100k' },
  { value: '100-150k', label: '$100–150k' },
  { value: '150k+', label: '$150k+' },
];
const EDUCATION_OPTIONS = [
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'graduate', label: 'Graduate' },
];

function formatIncome(val: string | null): string {
  if (!val) return 'Not set';
  const map: Record<string, string> = {
    under_30k: 'Under $30k',
    '30-60k': '$30–60k',
    '60-100k': '$60–100k',
    '100-150k': '$100–150k',
    '150k+': '$150k+',
  };
  return map[val] ?? val;
}

function formatEducation(val: string | null): string {
  if (!val) return 'Not set';
  const map: Record<string, string> = {
    high_school: 'High School',
    some_college: 'Some College',
    bachelors: "Bachelor's",
    graduate: 'Graduate',
  };
  return map[val] ?? val;
}

interface ProfileState {
  age_range: string | null;
  gender: string | null;
  region_detail: string | null;
  political_lean: number | null;
  income_bracket: string | null;
  education_level: string | null;
}

type PickerType = 'age' | 'gender' | 'region' | 'politics' | 'income' | 'education' | null;

interface PickerOption { value: string | number; label: string }

interface PickerSheetProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string | number | null;
  onSelect: (val: string | number) => void;
  onClose: () => void;
}

function PickerSheet({ visible, title, options, selected, onSelect, onClose }: PickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => String(item.value)}
          renderItem={({ item }) => {
            const isActive = item.value === selected;
            return (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => { onSelect(item.value); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetRowText, isActive && { color: AMBER }]}>
                  {item.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-outline" size={16} color={AMBER} />
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sheetDivider} />}
          style={{ maxHeight: 320 }}
        />
      </View>
    </Modal>
  );
}

interface RegionPickerProps {
  visible: boolean;
  selected: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
}

function RegionPicker({ visible, selected, onSelect, onClose }: RegionPickerProps) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? ALL_STATES.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
    : ALL_STATES;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Select State</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search states..."
          placeholderTextColor="#444"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => {
            const isActive = item.code === selected;
            return (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => { onSelect(item.code); onClose(); setSearch(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetRowText, isActive && { color: AMBER }]}>
                  {item.name}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-outline" size={16} color={AMBER} />
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sheetDivider} />}
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileState>({
    age_range: null,
    gender: null,
    region_detail: null,
    political_lean: null,
    income_bracket: null,
    education_level: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openPicker, setOpenPicker] = useState<PickerType>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('age_range, gender, region_detail, political_lean, income_bracket, education_level')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            age_range: data.age_range ?? null,
            gender: data.gender ?? null,
            region_detail: data.region_detail ?? null,
            political_lean: data.political_lean ?? null,
            income_bracket: data.income_bracket ?? null,
            education_level: data.education_level ?? null,
          });
        }
        setLoadingProfile(false);
      });
  }, [user?.id]);

  const handleSave = useCallback(async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        age_range: profile.age_range,
        gender: profile.gender,
        region_detail: profile.region_detail,
        political_lean: profile.political_lean,
        income_bracket: profile.income_bracket,
        education_level: profile.education_level,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      setToast({ message: 'Could not save. Please try again.', variant: 'error' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['board', user.id] });
      setToast({ message: 'Profile updated', variant: 'success' });
      setTimeout(() => router.back(), 1200);
    }
  }, [user?.id, saving, profile, queryClient]);

  const ageDisplay = profile.age_range ?? 'Not set';
  const genderDisplay = profile.gender ? formatGroupLabel('gender', profile.gender) : 'Not set';
  const regionDisplay = profile.region_detail ? getStateName(profile.region_detail) : 'Not set';
  const politicsDisplay = profile.political_lean !== null
    ? formatGroupLabel('politics', String(profile.political_lean))
    : 'Not set';
  const incomeDisplay = formatIncome(profile.income_bracket);
  const educationDisplay = formatEducation(profile.education_level);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={22} color="#888" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loadingProfile ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={AMBER} />
            </View>
          ) : (
            <View style={styles.rows}>
              <SettingsRow label="Age Range" value={ageDisplay} onPress={() => setOpenPicker('age')} />
              <SettingsRow label="Region" value={regionDisplay} onPress={() => setOpenPicker('region')} />
              <SettingsRow label="Political Lean" value={politicsDisplay} onPress={() => setOpenPicker('politics')} />
              <SettingsRow label="Gender" value={genderDisplay} onPress={() => setOpenPicker('gender')} />
              <SettingsRow label="Income Bracket" value={incomeDisplay} onPress={() => setOpenPicker('income')} />
              <SettingsRow label="Education" value={educationDisplay} onPress={() => setOpenPicker('education')} />
            </View>
          )}
        </ScrollView>

        {/* Save button */}
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Pickers */}
      <PickerSheet
        visible={openPicker === 'age'}
        title="Age Range"
        options={AGE_OPTIONS.map(v => ({ value: v, label: v }))}
        selected={profile.age_range}
        onSelect={(v) => setProfile(p => ({ ...p, age_range: String(v) }))}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        visible={openPicker === 'gender'}
        title="Gender"
        options={GENDER_OPTIONS}
        selected={profile.gender}
        onSelect={(v) => setProfile(p => ({ ...p, gender: String(v) }))}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        visible={openPicker === 'politics'}
        title="Political Lean"
        options={POLITICS_OPTIONS}
        selected={profile.political_lean}
        onSelect={(v) => setProfile(p => ({ ...p, political_lean: Number(v) }))}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        visible={openPicker === 'income'}
        title="Income Bracket"
        options={INCOME_OPTIONS}
        selected={profile.income_bracket}
        onSelect={(v) => setProfile(p => ({ ...p, income_bracket: String(v) }))}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        visible={openPicker === 'education'}
        title="Education"
        options={EDUCATION_OPTIONS}
        selected={profile.education_level}
        onSelect={(v) => setProfile(p => ({ ...p, education_level: String(v) }))}
        onClose={() => setOpenPicker(null)}
      />
      <RegionPicker
        visible={openPicker === 'region'}
        selected={profile.region_detail}
        onSelect={(code) => setProfile(p => ({ ...p, region_detail: code }))}
        onClose={() => setOpenPicker(null)}
      />

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

interface SettingsRowProps {
  label: string;
  value: string;
  onPress: () => void;
}
function SettingsRow({ label, value, onPress }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-forward-outline" size={14} color="#444" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F5F5F5',
  },

  loadingBox: { height: 200, alignItems: 'center', justifyContent: 'center' },

  rows: { gap: 8 },
  row: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F5F5F5',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '55%',
  },
  rowValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#888',
    textAlign: 'right',
  },

  saveContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  saveBtn: {
    backgroundColor: '#C8762A',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFF8F0',
  },

  // Modal / sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 99,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#F5F5F5',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sheetRowText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#E8E8E8',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#F5F5F5',
  },
});
