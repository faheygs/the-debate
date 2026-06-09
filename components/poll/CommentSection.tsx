import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/colors';
import { pluralize, getStateName } from '@/lib/utils';
import type { PublicComment } from '@/types/database';

const AMBER = '#C8762A';
const ROSE = '#E57373';

interface Props {
  comments: PublicComment[];
  opinionCount: number;
  onOpinionVote?: (commentId: string, value: 1 | -1) => void;
  onError?: (msg: string) => void;
}

export function CommentSection({ comments, opinionCount, onOpinionVote }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: colors.text }]}>Opinions</Text>
        <Text style={[styles.headingCount, { color: colors.textTertiary }]}>
          {pluralize(opinionCount, 'opinion')}
        </Text>
      </View>

      {comments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No opinions yet. Be the first.
          </Text>
        </View>
      ) : (
        comments.map((c) => (
          <CommentCard key={c.id} comment={c} onOpinionVote={onOpinionVote} />
        ))
      )}
    </View>
  );
}

function CommentCard({
  comment,
  onOpinionVote,
}: {
  comment: PublicComment;
  onOpinionVote?: (commentId: string, value: 1 | -1) => void;
}) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const attribution = formatAttribution(comment.age_range, comment.region_detail);
  const upCount = comment.up_count ?? 0;
  const downCount = comment.down_count ?? 0;
  const userVote = comment.user_opinion_vote ?? null;

  const upActive = userVote === 1;
  const downActive = userVote === -1;

  const cardBg = isDark ? '#161616' : '#FAFAFA';
  const cardBorder = isDark ? '#252525' : '#EBEBEB';
  const contentColor = isDark ? '#E8E8E8' : '#1A1A1A';

  const upBg = isDark ? '#1E1208' : '#FDF3E7';
  const downBg = isDark ? '#1F1010' : '#FFF0F0';

  const defaultPillBg = isDark ? '#1E1E1E' : colors.surfaceAlt;
  const defaultPillBorder = isDark ? '#2A2A2A' : colors.borderMid;
  const defaultPillColor = isDark ? '#555555' : colors.textTertiary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: cardBorder },
        comment.pending && styles.cardPending,
      ]}
    >
      <View style={styles.amberLine} />

      <Text style={[styles.content, { color: contentColor }]}>{comment.content}</Text>

      <View style={styles.cardFooter}>
        {comment.pending ? (
          <Text style={[styles.attribution, { color: '#888888' }]}>Posting…</Text>
        ) : attribution ? (
          <Text style={[styles.attribution, { color: '#888888' }]}>{attribution}</Text>
        ) : (
          <View style={styles.attributionSpacer} />
        )}

        {!comment.pending && (
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: upActive ? upBg : defaultPillBg,
                  borderColor: upActive ? AMBER : defaultPillBorder,
                },
              ]}
              onPress={() => onOpinionVote?.(comment.id, 1)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={upActive ? 'thumbs-up' : 'thumbs-up-outline'}
                size={12}
                color={upActive ? AMBER : defaultPillColor}
              />
              <Text style={[styles.pillCount, { color: upActive ? AMBER : defaultPillColor }]}>
                {upCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: downActive ? downBg : defaultPillBg,
                  borderColor: downActive ? ROSE : defaultPillBorder,
                },
              ]}
              onPress={() => onOpinionVote?.(comment.id, -1)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={downActive ? 'thumbs-down' : 'thumbs-down-outline'}
                size={12}
                color={downActive ? ROSE : defaultPillColor}
              />
              <Text style={[styles.pillCount, { color: downActive ? ROSE : defaultPillColor }]}>
                {downCount}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function formatAttribution(age_range: string | null, region_detail: string | null): string {
  const parts: string[] = [];
  if (age_range) parts.push(age_range);
  if (region_detail) parts.push(getStateName(region_detail));
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  headingCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  amberLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(200, 118, 42, 0.15)',
  },
  cardPending: {
    opacity: 0.6,
  },
  content: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attribution: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  attributionSpacer: { flex: 1 },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    minHeight: 28,
  },
  pillCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
});
