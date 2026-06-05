import { useState } from 'react';
import { Stack } from 'expo-router';
import { OnboardingContext } from '@/hooks/useOnboarding';
import type { OnboardingData } from '@/types/app';

export default function OnboardingLayout() {
  const [data, setData] = useState<Partial<OnboardingData>>({});

  function set(updates: Partial<OnboardingData>) {
    setData(prev => ({ ...prev, ...updates }));
  }

  return (
    <OnboardingContext.Provider value={{ data, set }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </OnboardingContext.Provider>
  );
}
