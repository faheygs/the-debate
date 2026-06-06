import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import type { PublicComment } from '@/types/database';

interface Props {
  comments: PublicComment[];
  onError?: (msg: string) => void;
}

export function CommentSection({ comments }: Props) {
  const colors = useColors();

  if (comments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No voices yet. Be the first.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.text }]}>Voices</Text>
      {comments.map((c) => (
        <CommentCard key={c.id} comment={c} />
      ))}
    </View>
  );
}

function CommentCard({ comment }: { comment: PublicComment }) {
  const colors = useColors();
  const attribution = formatAttribution(comment.age_range, comment.region_detail, comment.political_lean);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        comment.pending && styles.cardPending,
      ]}
    >
      <Text style={[styles.content, { color: colors.text }]}>{comment.content}</Text>
      {comment.pending ? (
        <Text style={[styles.attribution, { color: colors.textTertiary }]}>Posting…</Text>
      ) : attribution ? (
        <Text style={[styles.attribution, { color: colors.textTertiary }]}>— {attribution}</Text>
      ) : null}
    </View>
  );
}

function formatAttribution(
  age_range: string | null,
  region_detail: string | null,
  political_lean: number | null,
): string {
  const parts: string[] = [];
  if (age_range) parts.push(age_range);
  if (region_detail) parts.push(region_detail);
  if (political_lean !== null) parts.push(politicalLabel(political_lean));
  return parts.join(' · ');
}

function politicalLabel(lean: number): string {
  if (lean <= -2) return 'Very Liberal';
  if (lean === -1) return 'Liberal';
  if (lean === 0) return 'Moderate';
  if (lean === 1) return 'Conservative';
  return 'Very Conservative';
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    marginBottom: 2,
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  card: {
    borderRadius: 10,
    borderWidth: 0.5,
    padding: 12,
    gap: 6,
  },
  cardPending: {
    opacity: 0.6,
  },
  content: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  attribution: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
});
