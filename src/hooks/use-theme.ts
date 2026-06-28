import { Colors } from '@/constants/theme';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';
import { useHabits } from '@/context/habits-context';

export function useActiveColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  let theme: 'light' | 'dark' = systemScheme === 'unspecified' ? 'light' : (systemScheme || 'light');

  try {
    const context = useHabits();
    if (context && context.settings && context.settings.theme) {
      theme = context.settings.theme === 'system'
        ? (systemScheme === 'unspecified' ? 'light' : (systemScheme || 'light'))
        : context.settings.theme;
    }
  } catch {
    // If context is not available yet (e.g. rendering outside HabitsProvider)
  }

  return theme;
}

export function useTheme() {
  const scheme = useActiveColorScheme();
  return Colors[scheme];
}

