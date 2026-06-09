import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'PH', name: 'Philippines' },
  { code: 'OTHER', name: 'Other' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const CA_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
const AU_STATES = ['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'];

function getSubregions(countryCode: string): string[] {
  if (countryCode === 'US') return US_STATES;
  if (countryCode === 'CA') return CA_PROVINCES;
  if (countryCode === 'AU') return AU_STATES;
  return [];
}

function detectDefaultCountry(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const parts = locale.split('-');
    const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
    return COUNTRIES.find(c => c.code === region) ? region : 'US';
  } catch {
    return 'US';
  }
}

type PickerProps = {
  visible: boolean;
  items: { code: string; name: string }[];
  onSelect: (code: string) => void;
  onClose: () => void;
  title: string;
};

function ListPicker({ visible, items, onSelect, onClose, title }: PickerProps) {
  const colors = useColors();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalDone, { color: colors.accent }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.search, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            placeholder="Search..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          <FlatList
            data={filtered}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.listItem,
                  { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                ]}
                onPress={() => { onSelect(item.code); onClose(); setQuery(''); }}
              >
                <Text style={[styles.listItemText, { color: colors.text }]}>{item.name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function RegionScreen() {
  const colors = useColors();
  const { data, set } = useOnboarding();
  const [country, setCountry] = useState<string>(data.region ?? detectDefaultCountry());
  const [regionDetail, setRegionDetail] = useState<string | null>(data.region_detail ?? null);
  const [showCountry, setShowCountry] = useState(false);
  const [showRegion, setShowRegion] = useState(false);

  const subregions = getSubregions(country);
  const countryName = COUNTRIES.find(c => c.code === country)?.name ?? country;

  function handleContinue() {
    set({ region: country, region_detail: subregions.length > 0 ? regionDetail : null });
    router.push('/(auth)/onboarding/politics');
  }

  function handleSkip() {
    set({ region: null, region_detail: null });
    router.push('/(auth)/onboarding/politics');
  }

  const canContinue = !subregions.length || regionDetail !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={3} total={7} />

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Where are you from?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Used to show regional vote breakdowns.
          </Text>
        </View>

        <View style={styles.selectors}>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => setShowCountry(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.selectorLabel, { color: colors.textTertiary }]}>Country</Text>
            <Text style={[styles.selectorValue, { color: colors.text }]}>{countryName}</Text>
          </TouchableOpacity>

          {subregions.length > 0 && (
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => setShowRegion(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.selectorLabel, { color: colors.textTertiary }]}>State / Province</Text>
              <Text style={[styles.selectorValue, { color: regionDetail ? colors.text : colors.textTertiary }]}>
                {regionDetail ?? 'Select...'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: canContinue ? colors.accent : colors.surfaceAlt }]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: canContinue ? colors.accentText : colors.textTertiary }]}>
              Continue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ListPicker
        visible={showCountry}
        title="Select Country"
        items={COUNTRIES.map(c => ({ code: c.code, name: c.name }))}
        onSelect={code => { setCountry(code); setRegionDetail(null); }}
        onClose={() => setShowCountry(false)}
      />

      <ListPicker
        visible={showRegion}
        title="Select State / Province"
        items={subregions.map(r => ({ code: r, name: r }))}
        onSelect={setRegionDetail}
        onClose={() => setShowRegion(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: 16 },
  content: { paddingHorizontal: 16, gap: 8 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 22 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  selectors: { paddingHorizontal: 16, gap: 12 },
  selector: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  selectorLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  selectorValue: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  footer: { marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 24, gap: 8, alignItems: 'center' },
  skip: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  button: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  modal: { flex: 1 },
  modalSafe: { flex: 1, gap: 12 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  modalDone: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  search: {
    height: 44,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    borderWidth: 1,
  },
  listItem: { paddingHorizontal: 16, paddingVertical: 12 },
  listItemText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  separator: { height: 1, marginHorizontal: 16 },
});
