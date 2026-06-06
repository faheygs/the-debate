import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { submitComment } from '@/lib/api';
import type { PublicComment } from '@/types/database';

const MAX_CHARS = 150;

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

interface Props {
  pollId: string;
  hasCommented: boolean;
  onOptimisticComment: (comment: PublicComment) => void;
  onConfirmComment: (tempId: string, realComment: PublicComment) => void;
  onRemoveComment: (tempId: string) => void;
  onError: (msg: string) => void;
  onBlocked?: (msg: string) => void;
}

export function CommentInput({
  pollId,
  hasCommented,
  onOptimisticComment,
  onConfirmComment,
  onRemoveComment,
  onError,
  onBlocked,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  // Hidden once commented — "Your voice" card is shown above the Voices list
  if (hasCommented) return null;

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = generateId();
    const optimistic: PublicComment = {
      id: tempId,
      content: trimmed,
      created_at: new Date().toISOString(),
      age_range: null,
      region_detail: null,
      political_lean: null,
      pending: true,
    };

    // Show comment instantly, close input
    onOptimisticComment(optimistic);
    setText('');

    // Fire API in background — no await before display
    submitComment(pollId, trimmed).then((result) => {
      if (result.approved && result.comment) {
        onConfirmComment(tempId, result.comment as PublicComment);
      } else {
        onRemoveComment(tempId);
        const msg = 'Your voice was blocked. Keep it on topic and respectful.';
        onBlocked ? onBlocked(msg) : onError(msg);
      }
    }).catch((err: unknown) => {
      onRemoveComment(tempId);
      onError(err instanceof Error ? err.message : 'Failed to post comment');
    });
  }

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const canSubmit = text.trim().length > 0 && !overLimit;

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
              {
                color: overLimit
                  ? colors.disagree
                  : remaining <= 20
                  ? colors.trending
                  : colors.textTertiary,
              },
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
            <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.textTertiary }]}>
              Post
            </Text>
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
});
