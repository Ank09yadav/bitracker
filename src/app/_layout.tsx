import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { HabitsProvider } from '@/context/habits-context';
import { useActiveColorScheme } from '@/hooks/use-theme';

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
  return <AppTabs />;;
}

export default function TabLayout() {
  return (
    <HabitsProvider>
      <AppContent />
    </HabitsProvider>
  );
}
