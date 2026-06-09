import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useColors } from '@/constants/colors';
import { Animated } from 'react-native';

const BAR_W = 300;   // SVG coordinate width
const BAR_H = 44;    // SVG coordinate height (matches default height prop)
const SLASH = 18;    // diagonal lean in SVG units

const AMBER = '#C8762A';
const BAR_TEXT = '#FFF8F0'; // white on both amber and slate backgrounds

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export interface VoteBarProps {
  agreePct: number;         // 0–100
  userVote: 1 | -1 | null;
  totalVotes: number;
  height?: number;          // default 44
  agreeCount?: number;      // when provided, shows "X of Y" instead of "%"
  disagreeCount?: number;
  totalCount?: number;
  optionALabel?: string;
  optionBLabel?: string;
}

export function VoteBar({ agreePct, userVote, totalVotes, height = BAR_H, agreeCount, disagreeCount, totalCount }: VoteBarProps) {
  const colors = useColors();

  if (userVote === null) {
    return (
      <View style={[styles.neutralBar, { backgroundColor: colors.border, height, borderRadius: 10 }]}>
        <Text style={[styles.neutralText, { color: colors.textTertiary }]}>
          Cast your vote to see results
        </Text>
      </View>
    );
  }

  return (
    <VotedBarSVG
      agreePct={agreePct}
      userVote={userVote}
      height={height}
      colors={colors}
      agreeCount={agreeCount}
      disagreeCount={disagreeCount}
      totalCount={totalCount}
    />
  );
}

// ── Voted bar with diagonal SVG split ─────────────────────────────────────────

function VotedBarSVG({
  agreePct,
  userVote,
  height,
  colors,
  agreeCount,
  disagreeCount,
  totalCount,
}: {
  agreePct: number;
  userVote: 1 | -1;
  height: number;
  colors: ReturnType<typeof useColors>;
  agreeCount?: number;
  disagreeCount?: number;
  totalCount?: number;
}) {
  const prevVote = useRef<1 | -1 | null>(null);
  const initialPx = prevVote.current === null ? BAR_W / 2 : (agreePct / 100) * BAR_W;
  const [splitPx, setSplitPx] = useState(initialPx);
  const anim = useRef(new Animated.Value(initialPx)).current;

  useEffect(() => {
    const targetPx = (agreePct / 100) * BAR_W;

    if (prevVote.current === null) {
      // Transitioning from un-voted — animate from center to actual
      const id = anim.addListener(({ value }) => setSplitPx(value));
      Animated.spring(anim, {
        toValue: targetPx,
        tension: 160,
        friction: 20,
        useNativeDriver: false,
      }).start(() => anim.removeListener(id));
    } else {
      // Already voted (realtime pct update or mounted with vote) — snap
      anim.setValue(targetPx);
      setSplitPx(targetPx);
    }
    prevVote.current = userVote;
  }, [agreePct, userVote]);

  const bottom = clamp(splitPx, 0, BAR_W);
  // No slash at absolute edges — prevents a slate triangle when one side is 100%
  const top = splitPx <= 0 || splitPx >= BAR_W
    ? bottom
    : clamp(splitPx + SLASH, 0, BAR_W);

  // userVote === 1 (agree): amber on left, slate on right
  // userVote === -1 (disagree): slate on left, amber on right
  const amberPts =
    userVote === 1
      ? `0,0 ${top},0 ${bottom},${BAR_H} 0,${BAR_H}`
      : `${top},0 ${BAR_W},0 ${BAR_W},${BAR_H} ${bottom},${BAR_H}`;

  const slatePts =
    userVote === 1
      ? `${top},0 ${BAR_W},0 ${BAR_W},${BAR_H} ${bottom},${BAR_H}`
      : `0,0 ${top},0 ${bottom},${BAR_H} 0,${BAR_H}`;

  const disagPct = 100 - agreePct;

  const useCounts = agreeCount !== undefined && disagreeCount !== undefined && totalCount !== undefined;

  const leftLabel = useCounts ? `${agreeCount} of ${totalCount}` : `${Math.round(agreePct)}%`;
  const rightLabel = useCounts ? `${disagreeCount} of ${totalCount}` : `${Math.round(disagPct)}%`;

  const leftIsAmber = userVote === 1;
  const leftFamily = useCounts ? 'Inter_600SemiBold' : (leftIsAmber ? 'Inter_600SemiBold' : 'Inter_500Medium');
  const rightFamily = useCounts ? 'Inter_600SemiBold' : (!leftIsAmber ? 'Inter_600SemiBold' : 'Inter_500Medium');
  const leftSize = useCounts ? 12 : (leftIsAmber ? 13 : 12);
  const rightSize = useCounts ? 12 : (!leftIsAmber ? 13 : 12);

  const showLeft = useCounts ? agreeCount! > 0 : Math.round(agreePct) > 0;
  const showRight = useCounts ? disagreeCount! > 0 : Math.round(disagPct) > 0;

  return (
    <View style={[styles.barWrap, { height, borderRadius: 10, overflow: 'hidden' }]}>
      <Svg
        viewBox={`0 0 ${BAR_W} ${BAR_H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
      >
        <Polygon points={slatePts} fill={colors.slateVote} />
        <Polygon points={amberPts} fill={AMBER} />
      </Svg>

      {/* Floating labels — omit on empty (0) side */}
      <View style={styles.labelsOverlay} pointerEvents="none">
        {showLeft ? (
          <Text style={{ fontFamily: leftFamily, fontSize: leftSize, color: BAR_TEXT }}>
            {leftLabel}
          </Text>
        ) : <View />}
        {showRight ? (
          <Text style={{ fontFamily: rightFamily, fontSize: rightSize, color: BAR_TEXT }}>
            {rightLabel}
          </Text>
        ) : <View />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  neutralBar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutralText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  barWrap: {},
  labelsOverlay: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
