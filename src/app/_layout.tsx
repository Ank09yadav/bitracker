import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { HabitsProvider } from '@/context/habits-context';
import { useActiveColorScheme } from '@/hooks/use-theme';

function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: any = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require('expo-notifications');

      // 1. Handle notification tapped while app is running (foreground/background)
      subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const habitId = response.notification.request.content.data?.habitId;
        if (habitId) {
          router.navigate(`/habit/${habitId}` as any);
        }
      });

      // 2. Handle notification that launched the app from killed state
      Notifications.getLastNotificationResponseAsync().then((response: any) => {
        const habitId = response?.notification?.request?.content?.data?.habitId;
        if (habitId) {
          router.navigate(`/habit/${habitId}` as any);
        }
      });
    } catch (error) {
      console.warn('expo-notifications failed to initialize in layout:', error);
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [router]);

  return null;
}

function AppContent() {
  const scheme = useActiveColorScheme();
  const theme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={theme}>
      <AnimatedSplashOverlay />
      <AppContentWrapper />
    </ThemeProvider>
  );
}

function AppContentWrapper() {
  return (
    <>
      <NotificationHandler />
      <AppTabs />
    </>
  );
}

export default function TabLayout() {
  return (
    <HabitsProvider>
      <AppContent />
    </HabitsProvider>
  );
}
