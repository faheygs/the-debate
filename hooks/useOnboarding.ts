import { createContext, useContext } from 'react';
import type { OnboardingData } from '@/types/app';

type OnboardingContextType = {
  data: Partial<OnboardingData>;
  set: (updates: Partial<OnboardingData>) => void;
};

export const OnboardingContext = createContext<OnboardingContextType>({
  data: {},
  set: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}
