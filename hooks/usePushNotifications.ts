// TODO: Re-enable when EAS build includes expo-notifications
// import * as Notifications from 'expo-notifications'
// import * as Device from 'expo-device'
// import Constants from 'expo-constants'
// import { router } from 'expo-router'
// import { supabase } from '@/lib/supabase'

export function usePushNotifications(_userId: string | null) {
  // Push notifications disabled until next EAS build
  return { expoPushToken: null, notification: null };
}
