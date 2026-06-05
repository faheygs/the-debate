import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/constants/colors';
import { Spacing } from '@/constants/theme';
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

  const labelA = pollType === 'versus' && optionA ? optionA.toUpperCase() : 'AGREE';
  const labelB = pollType === 'versus' && optionB ? optionB.toUpperCase() : 'DISAGREE';

  const votedA = userVote === 1;
  const votedB = userVote === -1;
  const voted = userVote !== null;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: votedA ? colors.agree : colors.agreeLight,
            borderColor: votedA ? colors.agree : colors.agreeBorder,
          },
          voted && !votedA && styles.btnDimmed,
        ]}
        onPress={() => onVote(1)}
        disabled={disabled || voted}
        activeOpacity={0.8}
      >
        <ThemedText
          style={[
            styles.label,
            { color: votedA ? '#fff' : colors.agreeText },
          ]}
        >
          {labelA}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: votedB ? colors.disagree : colors.disagreeLight,
            borderColor: votedB ? colors.disagree : colors.disagreeBorder,
          },
          voted && !votedB && styles.btnDimmed,
        ]}
        onPress={() => onVote(-1)}
        disabled={disabled || voted}
        activeOpacity={0.8}
      >
        <ThemedText
          style={[
            styles.label,
            { color: votedB ? '#fff' : colors.disagreeText },
          ]}
        >
          {labelB}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  btnDimmed: { opacity: 0.4 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
