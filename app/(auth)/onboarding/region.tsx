import { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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

const CA_PROVINCES = [
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
];

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
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.modal}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <ThemedText type="default" themeColor="textSecondary">Done</ThemedText>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.search,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Search..."
            placeholderTextColor={theme.textSecondary}
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
                  { backgroundColor: pressed ? theme.backgroundElement : 'transparent' },
                ]}
                onPress={() => { onSelect(item.code); onClose(); setQuery(''); }}
              >
                <ThemedText type="default">{item.name}</ThemedText>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
            )}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

export default function RegionScreen() {
  const theme = useTheme();
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

  const canContinue = !subregions.length || regionDetail !== null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ProgressBar current={3} total={7} />

        <View style={styles.content}>
          <ThemedText type="subtitle">Where are you from?</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Used to show regional vote breakdowns.
          </ThemedText>
        </View>

        <View style={styles.selectors}>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
            onPress={() => setShowCountry(true)}
            activeOpacity={0.75}
          >
            <ThemedText type="small" themeColor="textSecondary">Country</ThemedText>
            <ThemedText type="default">{countryName}</ThemedText>
          </TouchableOpacity>

          {subregions.length > 0 && (
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              onPress={() => setShowRegion(true)}
              activeOpacity={0.75}
            >
              <ThemedText type="small" themeColor="textSecondary">State / Province</ThemedText>
              <ThemedText type="default">{regionDetail ?? 'Select...'}</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <ThemedText style={styles.buttonText}>Continue</ThemedText>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: Spacing.four },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  selectors: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  selector: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
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
  modal: { flex: 1 },
  modalSafe: { flex: 1, gap: Spacing.three },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  search: {
    height: 44,
    marginHorizontal: Spacing.four,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    borderWidth: 1,
  },
  listItem: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  separator: { height: 1, marginHorizontal: Spacing.four },
});
