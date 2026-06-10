import { Tabs, Redirect } from 'expo-router';
import { Platform, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/constants/colors';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function TabsLayout() {
  const { session, loading, user } = useAuth();
  const colors = useColors();

  const { data: badgeData } = useQuery({
    queryKey: ['insight_badge', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('users')
        .select('insight_badge')
        .eq('id', user.id)
        .single();
      return data?.insight_badge ?? false;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
  const showBadge = !!badgeData;

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/auth" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Platform.select({ ios: 0, default: Spacing.two }),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'house', android: 'home', web: 'home' }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Debate',
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: 'Board',
          tabBarIcon: ({ color, size }) => (
            <View>
              <SymbolView
                name={{ ios: 'person.circle', android: 'person', web: 'person' }}
                tintColor={color}
                size={size}
              />
              {showBadge && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#E53935',
                  borderWidth: 1.5,
                  borderColor: colors.background,
                }} />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
