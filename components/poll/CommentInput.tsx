import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { submitComment } from '@/lib/api';
import type { PublicComment } from '@/types/database';

const MAX_CHARS = 150;

interface Props {
  pollId: string;
  hasCommented: boolean;
  userComment: string | null;
  onCommentAdded: (comment: PublicComment) => void;
  onError: (msg: string) => void;
}

export function CommentInput({ pollId, hasCommented, userComment, onCommentAdded, onError }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (hasCommented) {
    return (
      <View
        style={[
          styles.lockedContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={[styles.lockedCard, { borderColor: colors.primary }]}>
          <Text style={[styles.lockedLabel, { color: colors.primary }]}>Your voice</Text>
          <Text style={[styles.lockedText, { color: colors.text }]} numberOfLines={2}>
            {userComment}
          </Text>
        </View>
      </View>
    );
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitComment(pollId, trimmed);
      if (result.approved && result.comment) {
        setText('');
        onCommentAdded(result.comment as PublicComment);
      } else {
        onError('Your comment was blocked by our moderation filter. Try rephrasing.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit comment';
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const canSubmit = text.trim().length > 0 && !overLimit && !submitting;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Add your voice… one shot, make it count"
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX_CHARS + 20}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <View style={styles.inputFooter}>
          <Text
            style={[
              styles.charCount,
              { color: overLimit ? colors.disagree : remaining <= 20 ? colors.trending : colors.textTertiary },
            ]}
          >
            {remaining}
          </Text>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? colors.primary : colors.surfaceAlt },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.textTertiary }]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputRow: {
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 6,
  },
  input: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 80,
    minHeight: 20,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  submitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  lockedContainer: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  lockedCard: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
    gap: 2,
  },
  lockedLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  lockedText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
