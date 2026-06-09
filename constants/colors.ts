export const Colors = {
  dark: {
    accent: "#C8762A",
    accentText: "#FFF8F0",
    accentDark: "#A85E1E",

    background: "#0F0F0F",
    surface: "#1A1A1A",
    surfaceAlt: "#242424",
    border: "#2A2A2A",
    borderMid: "#333333",

    text: "#F5F5F5",
    textSecondary: "#888888",
    textTertiary: "#555555",
    textDimmed: "#444444",

    slateVote: "#2A3440",
    slateVoteBorder: "#3A4550",
    slateVoteText: "#6B8299",
  },
  light: {
    accent: "#C8762A",
    accentText: "#FFF8F0",
    accentDark: "#A85E1E",

    background: "#F7F5F2",
    surface: "#FFFFFF",
    surfaceAlt: "#F2EEE8",
    border: "#E8E4DE",
    borderMid: "#DDD9D2",

    text: "#1A1A1A",
    textSecondary: "#888888",
    textTertiary: "#AAAAAA",
    textDimmed: "#C8C4BC",

    slateVote: "#D4DDE6",
    slateVoteBorder: "#C4CDD6",
    slateVoteText: "#6B8299",
  },
};

export type AppColors = typeof Colors.dark;

import { useColorScheme } from "react-native";
export const useColors = (): AppColors => {
  const scheme = useColorScheme();
  return scheme === "dark" ? Colors.dark : Colors.light;
};
