import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalBoard } from '@/hooks/usePersonalBoard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Toast } from '@/components/shared/Toast';
import { formatGroupLabel, getStateName } from '@/lib/utils';
import type { UserProfile, BoardStats } from '@/types/database';

const AMBER = '#C8762A';
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatMemberSince(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatEducation(val: string | null): string | null {
  if (!val) return null;
  const map: Record<string, string> = {
    high_school: 'High School',
    some_college: 'Some College',
    bachelors: "Bachelor's",
    graduate: 'Graduate',
  };
  return map[val] ?? null;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface RingIndicatorProps { score: number }
function RingIndicator({ score }: RingIndicatorProps) {
  const offset = RING_CIRCUMFERENCE * (1 - score / 100);
  return (
    <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={48} height={48} style={StyleSheet.absoluteFill}>
        <Circle cx={24} cy={24} r={RING_RADIUS} stroke="#252525" strokeWidth={3} fill="none" />
        <Circle
          cx={24} cy={24} r={RING_RADIUS}
          stroke={AMBER} strokeWidth={3} fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
      </Svg>
      <Text style={styles.ringText}>{score}%</Text>
    </View>
  );
}

interface DemographicChipsProps { profile: UserProfile | null }
function DemographicChips({ profile }: DemographicChipsProps) {
  if (!profile) return null;

  const chips: string[] = [];

  if (profile.age_range) chips.push(profile.age_range);
  if (profile.region_detail) chips.push(getStateName(profile.region_detail));
  if (profile.political_lean !== null) chips.push(formatGroupLabel('politics', String(profile.political_lean)));
  if (profile.gender) chips.push(formatGroupLabel('gender', profile.gender));
  const edu = formatEducation(profile.education_level);
  if (edu) chips.push(edu);

  if (chips.length === 0) return null;

  return (
    <View style={styles.chipsRow}>
      {chips.map((label, i) => (
        <View key={i} style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

interface EngagementCardProps {
  icon: string;
  value: number | string;
  label: string;
  valueColor?: string;
}
function EngagementCard({ icon, value, label, valueColor = '#F5F5F5' }: EngagementCardProps) {
  return (
    <View style={styles.engCard}>
      <Ionicons name={icon as any} size={14} color="#444" style={{ marginBottom: 6 }} />
      <Text style={[styles.engValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.engLabel}>{label}</Text>
    </View>
  );
}

interface VoteRowCardProps { children: React.ReactNode }
function VoteRowCard({ children }: VoteRowCardProps) {
  return <View style={styles.voteRowCard}>{children}</View>;
}

function contrarianDescription(score: number): string {
  if (score > 60) return 'You vote with the minority more than most';
  if (score >= 40) return "You're close to the average voter";
  return 'You tend to vote with the crowd';
}

export default function BoardScreen() {
  const isDark = useColorScheme() === 'dark';
  const { signOut, user } = useAuth();
  const { data, loading, refreshing, error, refetch } = usePersonalBoard();
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'info' } | null>(null);

  const onRefresh = () => {
    refetch().catch(() => {
      setToast({ message: "Couldn't refresh your board. Please try again.", variant: 'error' });
    });
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={AMBER}
      colors={[AMBER]}
    />
  );

  if (!loading && error && !data) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.emptyContent}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
          >
            <EmptyState
              icon="person-outline"
              heading="Couldn't load your board"
              subtext="Pull down to try again"
              button={{ label: 'Try Again', onPress: () => refetch() }}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const stats = data?.stats ?? null;
  const profile = data?.user_profile ?? null;
  const memberSince = profile?.created_at
    ? formatMemberSince(profile.created_at)
    : user?.created_at
    ? formatMemberSince(user.created_at)
    : null;

  const declaredLean = profile?.political_lean ?? null;
  const actualLean = stats?.actual_lean ?? null;
  const leanDiffers = declaredLean !== null && actualLean !== null &&
    Math.round(declaredLean) !== Math.round(actualLean);

  const actualLeanLabel = actualLean !== null
    ? formatGroupLabel('politics', String(Math.round(actualLean)))
    : null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {/* ── HEADER ──────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Your Board</Text>
              <Text style={styles.subtitle}>No name. Just your opinions.</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push('/board/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={14} color="#888" />
              <Text style={styles.settingsBtnText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* ── PROFILE CARD ────────────────────────────────────────── */}
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View>
                <Text style={styles.profileName}>Anonymous</Text>
                {memberSince ? (
                  <Text style={styles.profileSince}>Member since {memberSince}</Text>
                ) : null}
              </View>
            </View>
            <DemographicChips profile={profile} />
          </View>

          {/* ── ENGAGEMENT ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ENGAGEMENT</Text>
            <View style={styles.engGrid}>
              <View style={styles.engRow}>
                <EngagementCard
                  icon="bar-chart-outline"
                  value={stats?.total_votes ?? 0}
                  label="debates voted"
                />
                <EngagementCard
                  icon="chatbubble-outline"
                  value={stats?.total_comments ?? 0}
                  label="opinions posted"
                />
              </View>
              <View style={[styles.engRow, { marginTop: 8 }]}>
                <EngagementCard
                  icon="thumbs-up-outline"
                  value={stats?.total_opinion_votes ?? 0}
                  label="opinion votes given"
                  valueColor={AMBER}
                />
                <EngagementCard
                  icon="flame-outline"
                  value={stats?.days_active && stats.days_active > 0 ? stats.days_active : '—'}
                  label="day streak"
                />
              </View>
            </View>
          </View>

          {/* ── HOW YOU VOTE ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOW YOU VOTE</Text>

            {/* Row 1: Contrarian score */}
            <VoteRowCard>
              <View style={styles.voteRowLeft}>
                <Text style={styles.voteRowTitle}>Contrarian score</Text>
                <Text style={styles.voteRowValue}>
                  {stats ? `${stats.contrarian_score}%` : '—'}
                </Text>
                <Text style={styles.voteRowSub}>
                  {stats ? contrarianDescription(stats.contrarian_score) : 'Vote to see your score'}
                </Text>
              </View>
              {stats ? <RingIndicator score={Math.round(stats.contrarian_score)} /> : null}
            </VoteRowCard>

            {/* Row 2: Actual lean */}
            <VoteRowCard>
              <View style={styles.voteRowLeft}>
                <Text style={styles.voteRowTitle}>Your actual lean</Text>
                <Text style={styles.voteRowValue}>
                  {actualLeanLabel ?? '—'}
                </Text>
                {leanDiffers ? (
                  <Text style={styles.voteRowSub}>
                    Based on how you vote, not what you declared
                  </Text>
                ) : null}
              </View>
            </VoteRowCard>

            {/* Row 3: Top category */}
            <VoteRowCard>
              <View style={styles.voteRowLeft}>
                <Text style={styles.voteRowTitle}>Top category</Text>
                <Text style={styles.voteRowValue}>
                  {stats?.top_category ? capitalizeFirst(stats.top_category) : '—'}
                </Text>
                {stats?.top_category ? (
                  <Text style={styles.voteRowSub}>
                    {stats.top_category_pct}% of your votes
                  </Text>
                ) : null}
              </View>
              {stats?.top_category ? (
                <View style={styles.categoryBar}>
                  <View style={[styles.categoryBarFill, { width: Math.round(80 * stats.top_category_pct / 100) }]} />
                </View>
              ) : null}
            </VoteRowCard>

            {/* Row 4: Tendency stats */}
            <View style={styles.tendencyRow}>
              <View style={styles.tendencyCard}>
                <Text style={[styles.tendencyValue, { color: AMBER }]}>
                  {stats ? `${stats.majority_pct}%` : '—'}
                </Text>
                <Text style={styles.tendencyLabel}>voted with majority</Text>
              </View>
              <View style={styles.tendencyCard}>
                <Text style={[styles.tendencyValue, { color: '#6B8299' }]}>
                  {stats ? `${stats.minority_pct}%` : '—'}
                </Text>
                <Text style={styles.tendencyLabel}>voted with minority</Text>
              </View>
              <View style={styles.tendencyCard}>
                <Text style={[styles.tendencyValue, { color: AMBER }]}>
                  {stats ? `${stats.agree_pct}%` : '—'}
                </Text>
                <Text style={styles.tendencyLabel}>tend to agree</Text>
              </View>
            </View>
          </View>

          {/* ── VOTING HISTORY BUTTON ────────────────────────────────── */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/board/history')}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.historyBtnTitle}>Voting History</Text>
              <Text style={styles.historyBtnSub}>
                {stats?.total_votes ?? 0} debates participated in
              </Text>
            </View>
            <View style={styles.historyChevronBox}>
              <Ionicons name="chevron-forward-outline" size={16} color="#666" />
            </View>
          </TouchableOpacity>

          {/* ── SIGN OUT ─────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.6}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

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
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  emptyContent: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: { gap: 2 },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    color: '#F5F5F5',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#555',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  settingsBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#888',
  },

  // Profile card
  profileCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 28,
    gap: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F5F5F5',
  },
  profileSince: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Engagement grid
  engGrid: {},
  engRow: {
    flexDirection: 'row',
    gap: 8,
  },
  engCard: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 14,
  },
  engValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 26,
    marginBottom: 2,
  },
  engLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#555',
  },

  // Vote row cards
  voteRowCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voteRowLeft: {
    flex: 1,
    marginRight: 12,
    gap: 3,
  },
  voteRowTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#555',
  },
  voteRowValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#F5F5F5',
  },
  voteRowSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#666',
  },
  ringText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: AMBER,
  },
  categoryBar: {
    width: 80,
    height: 6,
    backgroundColor: '#252525',
    borderRadius: 99,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 6,
    backgroundColor: AMBER,
    borderRadius: 99,
  },

  // Tendency row
  tendencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 0,
  },
  tendencyCard: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 12,
    alignItems: 'center',
  },
  tendencyValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    marginBottom: 4,
  },
  tendencyLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
  },

  // Voting history button
  historyBtn: {
    marginHorizontal: 16,
    marginBottom: 28,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyBtnTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#F5F5F5',
  },
  historyBtnSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  historyChevronBox: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sign out
  signOutBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#444',
  },
});
