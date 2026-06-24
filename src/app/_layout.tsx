import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { HabitsProvider, useHabits } from '@/context/habits-context';

function AppContent() {
  const { settings } = useHabits();
  const systemScheme = useColorScheme();
  
  const activeScheme = settings.theme === 'system' ? systemScheme : settings.theme;
  const theme = activeScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={theme}>
      <AnimatedSplashOverlay />
      <AppContentWrapper />
    </ThemeProvider>
  );
}

function AppContentWrapper() {
  return <AppTabs />;;
}

export default function TabLayout() {
  return (
    <HabitsProvider>
      <AppContent />
    </HabitsProvider>
  );
}
