import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, type AppColors } from '@/constants/colors';

export const TOUR_FLAG = 'has_seen_welcome_tour';

type SlideData = {
  icon: keyof typeof Ionicons.glyphMap;
  heading: string;
  body: string;
};

const SLIDES: SlideData[] = [
  {
    icon: 'checkmark-circle',
    heading: "Once you vote, it's locked.",
    body: "No changing your mind. No take-backs.\nJust your honest, unfiltered opinion.",
  },
  {
    icon: 'chatbubble',
    heading: "One comment per poll. That's it.",
    body: "Say what you mean. You get one shot\nto add your voice — make it count.",
  },
  {
    icon: 'eye-off',
    heading: "No names. No photos. No usernames.",
    body: "Nobody knows who you are. Your opinion\nstands on its own — not your identity.",
  },
  {
    icon: 'shield-checkmark',
    heading: "Hate speech gets blocked. Automatically.",
    body: "AI screens every comment before it posts.\nSlurs, attacks, and hate speech never make it through.",
  },
  {
    icon: 'flame',
    heading: "The world is voting.",
    body: "Thousands of debates happening right now.\nJump in — your opinion matters.",
  },
];

async function exitTour() {
  await AsyncStorage.setItem(TOUR_FLAG, 'true');
  router.replace('/(tabs)');
}

export default function WelcomeTourScreen() {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const flatListRef = useRef<FlatList<SlideData>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLast = currentIndex === SLIDES.length - 1;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      if (index !== currentIndex) setCurrentIndex(index);
    },
    [currentIndex, width],
  );

  const renderItem = useCallback(
    ({ item }: { item: SlideData }) => (
      <SlideItem slide={item} width={width} colors={colors} />
    ),
    [width, colors],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        {/* Header — Skip link on slides 1–4 */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          {!isLast ? (
            <TouchableOpacity onPress={exitTour} hitSlop={12} activeOpacity={0.7}>
              <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.list}
        />

        {/* Footer — dots + CTA */}
        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex
                    ? [styles.dotActive, { backgroundColor: colors.primary }]
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <TouchableOpacity
              style={[styles.letsGoBtn, { backgroundColor: colors.primary }]}
              onPress={exitTour}
              activeOpacity={0.85}
            >
              <Text style={styles.letsGoBtnText}>Let's go</Text>
            </TouchableOpacity>
          ) : (
            // Reserve space so footer height stays fixed across all slides
            <View style={styles.btnPlaceholder} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

type SlideItemProps = {
  slide: SlideData;
  width: number;
  colors: AppColors;
};

function SlideItem({ slide, width, colors }: SlideItemProps) {
  return (
    <View style={[styles.slide, { width }]}>
      <Ionicons name={slide.icon} size={64} color={colors.primary} />
      <Text style={[styles.heading, { color: colors.text }]}>{slide.heading}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 44,
  },
  headerSpacer: { width: 48 },
  skipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },

  list: { flex: 1 },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 24,
    lineHeight: 31, // 1.3 × 24
    textAlign: 'center',
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 26, // ~1.6 × 16
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },

  letsGoBtn: {
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  letsGoBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#fff',
  },
  btnPlaceholder: {
    height: 52,
  },
});
