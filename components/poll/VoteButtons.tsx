import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import type { PollType } from '@/types/app';

type Props = {
  pollType: PollType;
  optionA?: string | null;
  optionB?: string | null;
  userVote: 1 | -1 | null;
  onVote: (value: 1 | -1) => void;
  disabled?: boolean;
};

export function VoteButtons({ pollType, optionA, optionB, userVote, onVote, disabled }: Props) {
  const colors = useColors();

  const labelA = pollType === 'versus' && optionA ? optionA : 'Agree';
  const labelB = pollType === 'versus' && optionB ? optionB : 'Disagree';

  const votedA = userVote === 1;
  const votedB = userVote === -1;
  const voted = userVote !== null;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          votedA && { backgroundColor: colors.accent, borderColor: colors.accent },
          voted && !votedA && { backgroundColor: colors.slateVote, borderColor: colors.slateVoteBorder },
        ]}
        onPress={() => onVote(1)}
        disabled={disabled || voted}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary },
            votedA && { color: colors.accentText, fontFamily: 'Inter_600SemiBold' },
            voted && !votedA && { color: colors.slateVoteText },
          ]}
          numberOfLines={1}
        >
          {labelA}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          votedB && { backgroundColor: colors.accent, borderColor: colors.accent },
          voted && !votedB && { backgroundColor: colors.slateVote, borderColor: colors.slateVoteBorder },
        ]}
        onPress={() => onVote(-1)}
        disabled={disabled || voted}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary },
            votedB && { color: colors.accentText, fontFamily: 'Inter_600SemiBold' },
            voted && !votedB && { color: colors.slateVoteText },
          ]}
          numberOfLines={1}
        >
          {labelB}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
