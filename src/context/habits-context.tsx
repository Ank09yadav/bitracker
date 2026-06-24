import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleHabitNotification, cancelHabitNotification, cancelAllNotifications } from '@/services/notifications';

export interface HabitProgress {
  progress: number;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string; // Emoji
  color: string; // Color code
  frequency: 'daily' | 'weekdays' | number[]; // number[] represents days of week 0 (Sun) to 6 (Sat)
  reminderTime: string; // e.g. "09:00 AM"
  progressTarget: number;
  progressUnit: string;
  history: Record<string, HabitProgress>; // key: YYYY-MM-DD
  notificationId: string | null;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  memberSince: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';
  language: string;
  dailyGoalTarget: number;
  weeklyObjective: number;
  notifications: {
    reminders: boolean;
    dailySummary: boolean;
    streakAlerts: boolean;
  };
  profile: UserProfile;
}

interface HabitsContextType {
  habits: Habit[];
  settings: UserSettings;
  addHabit: (habit: Omit<Habit, 'id' | 'history' | 'notificationId' | 'createdAt'>) => Promise<void>;
  updateHabit: (id: string, updatedFields: Partial<Omit<Habit, 'id' | 'history'>>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  updateHabitProgress: (id: string, dateStr: string, progress: number, completed?: boolean) => Promise<void>;
  toggleHabitComplete: (id: string, dateStr: string) => Promise<void>;
  updateSettings: (updatedSettings: Partial<UserSettings>) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshStreaks: () => void;
  isLoading: boolean;
}

const STORAGE_KEY_HABITS = '@bitracker_habits';
const STORAGE_KEY_SETTINGS = '@bitracker_settings';

// Helper to format Date as YYYY-MM-DD in local time
export function getLocalDateString(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Check if a habit is scheduled on a given date
export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ...
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return day >= 1 && day <= 5;
  if (Array.isArray(habit.frequency)) return habit.frequency.includes(day);
  return true;
}

// Calculate streak details for a habit
export function calculateStreak(habit: Habit, todayStr: string): { currentStreak: number; longestStreak: number } {
  const dates = Object.keys(habit.history).sort();
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const isScheduled = (d: Date) => isHabitScheduledOnDate(habit, d);
  
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Determine starting point for current streak
  let currentStreak = 0;
  let checkDate = new Date(todayStr);
  const todayFormatted = formatDate(checkDate);
  const todayRecord = habit.history[todayFormatted];

  let startDate = new Date(checkDate);
  if (todayRecord && todayRecord.completed) {
    // Today is completed, start from today
  } else {
    // Today is not completed, start counting from yesterday
    startDate.setDate(startDate.getDate() - 1);
  }

  // Count backward
  let tempDate = new Date(startDate);
  for (let i = 0; i < 365; i++) {
    const formatted = formatDate(tempDate);
    const scheduled = isScheduled(tempDate);

    if (scheduled) {
      const record = habit.history[formatted];
      if (record && record.completed) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }
    tempDate.setDate(tempDate.getDate() - 1);
  }

  // Calculate longest streak
  let longestStreak = 0;
  let runningStreak = 0;
  const oldestDate = new Date(dates[0]);
  const endDate = new Date(todayStr);
  let scanDate = new Date(oldestDate);

  while (scanDate <= endDate) {
    const formatted = formatDate(scanDate);
    const scheduled = isScheduled(scanDate);

    if (scheduled) {
      const record = habit.history[formatted];
      if (record && record.completed) {
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }
    scanDate.setDate(scanDate.getDate() + 1);
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}

// Initial seed history helper
function buildSeedHistory(
  habitFrequency: 'daily' | 'weekdays' | number[],
  completedOffsetDays: number[],
  progressData: Record<number, number> = {}
): Record<string, HabitProgress> {
  const history: Record<string, HabitProgress> = {};
  const today = new Date('2026-06-24'); // Match context local date in screenshots

  const isScheduled = (d: Date) => {
    const day = d.getDay();
    if (habitFrequency === 'daily') return true;
    if (habitFrequency === 'weekdays') return day >= 1 && day <= 5;
    if (Array.isArray(habitFrequency)) return habitFrequency.includes(day);
    return true;
  };

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Generate for past 30 days
  for (let offset = 0; offset <= 30; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    
    if (isScheduled(d)) {
      const formatted = formatDate(d);
      const isCompleted = completedOffsetDays.includes(offset);
      const progress = progressData[offset] !== undefined ? progressData[offset] : (isCompleted ? 1 : 0);
      
      history[formatted] = {
        progress,
        completed: isCompleted,
      };
    }
  }
  return history;
}

// SEED DATA matching the screenshots exactly
const getInitialHabits = (): Habit[] => [
  {
    id: '1',
    name: 'Drink Water',
    icon: '💧',
    color: '#0ea5e9',
    frequency: 'daily',
    reminderTime: '09:00 AM',
    progressTarget: 8,
    progressUnit: 'glasses',
    createdAt: '2026-05-01T00:00:00Z',
    notificationId: null,
    // Streak 7 days (today is June 24, incomplete). Completed offset 1 to 7 (June 23 to June 17)
    // June 24 (today) is offset 0: progress 6, completed false.
    history: {
      ...buildSeedHistory('daily', [1, 2, 3, 4, 5, 6, 7], { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8 }),
      '2026-06-24': { progress: 6, completed: false }
    }
  },
  {
    id: '2',
    name: 'Code 1 Hour',
    icon: '💻',
    color: '#6366f1',
    frequency: 'weekdays',
    reminderTime: '07:30 PM',
    progressTarget: 1,
    progressUnit: 'hour',
    createdAt: '2026-05-01T00:00:00Z',
    notificationId: null,
    // Streak 12 days. Today (June 24, Tue) is completed. Weekday completed offsets:
    // 0 (June 24 Tue), 1 (June 23 Mon), 4 (June 20 Fri), 5 (June 19 Thu), 6 (June 18 Wed), 7 (June 17 Tue), 8 (June 16 Mon), 11 (June 13 Fri), 12 (June 12 Thu), 13 (June 11 Wed), 14 (June 10 Tue), 15 (June 9 Mon).
    history: buildSeedHistory('weekdays', [0, 1, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15], {
      0: 1, 1: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1
    })
  },
  {
    id: '3',
    name: 'Read',
    icon: '📖',
    color: '#10b981',
    frequency: 'daily',
    reminderTime: '10:00 PM',
    progressTarget: 30,
    progressUnit: 'min',
    createdAt: '2026-05-01T00:00:00Z',
    notificationId: null,
    // Streak 4 days. Today is June 24, completed manually (18/30 completed).
    // Completed offsets: 0 (June 24), 1 (June 23), 2 (June 22), 3 (June 21). Offset 4 (June 20) missed.
    history: {
      ...buildSeedHistory('daily', [0, 1, 2, 3], { 1: 30, 2: 30, 3: 30 }),
      '2026-06-24': { progress: 18, completed: true }
    }
  },
  {
    id: '4',
    name: 'Workout',
    icon: '🏋️‍♂️',
    color: '#f43f5e',
    frequency: [1, 3, 5], // Mon, Wed, Fri
    reminderTime: '06:30 AM',
    progressTarget: 45,
    progressUnit: 'min',
    createdAt: '2026-05-01T00:00:00Z',
    notificationId: null,
    // Streak 9 days. Today (June 24, Tue) is incomplete/unscheduled, so streak starts from yesterday (June 23 Mon).
    // Mon, Wed, Fri completed offsets:
    // 1 (June 23 Mon), 4 (June 20 Fri), 6 (June 18 Wed), 8 (June 16 Mon), 11 (June 13 Fri), 13 (June 11 Wed), 15 (June 9 Mon), 18 (June 6 Fri), 20 (June 4 Wed).
    history: {
      ...buildSeedHistory([1, 3, 5], [1, 4, 6, 8, 11, 13, 15, 18, 20], {
        1: 45, 4: 45, 6: 45, 8: 45, 11: 45, 13: 45, 15: 45, 18: 45, 20: 45
      }),
      '2026-06-24': { progress: 0, completed: false }
    }
  }
];

const defaultSettings: UserSettings = {
  theme: 'light',
  units: 'metric',
  language: 'English',
  dailyGoalTarget: 5,
  weeklyObjective: 35,
  notifications: {
    reminders: true,
    dailySummary: true,
    streakAlerts: false,
  },
  profile: {
    name: 'Alex Morgan',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    memberSince: 'Jan 2024',
  },
};

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    async function loadStoredData() {
      try {
        const storedHabits = await AsyncStorage.getItem(STORAGE_KEY_HABITS);
        const storedSettings = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);

        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }

        if (storedHabits) {
          setHabits(JSON.parse(storedHabits));
        } else {
          // No habits stored, seed the initial mockup data
          const initial = getInitialHabits();
          setHabits(initial);
          await AsyncStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(initial));
        }
      } catch (error) {
        console.error('Failed to load data from storage:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredData();
  }, []);

  // Save habits helper
  const saveHabits = async (newHabits: Habit[]) => {
    setHabits(newHabits);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(newHabits));
    } catch (error) {
      console.error('Failed to save habits to storage:', error);
    }
  };

  // Save settings helper
  const saveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
    }
  };

  // Add Habit
  const addHabit = async (habitData: Omit<Habit, 'id' | 'history' | 'notificationId' | 'createdAt'>) => {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    let notificationId: string | null = null;
    if (settings.notifications.reminders) {
      notificationId = await scheduleHabitNotification(id, habitData.name, habitData.reminderTime);
    }

    const newHabit: Habit = {
      ...habitData,
      id,
      history: {},
      notificationId,
      createdAt,
    };

    await saveHabits([...habits, newHabit]);
  };

  // Update Habit (name, icon, frequency, reminderTime, progressTarget)
  const updateHabit = async (id: string, updatedFields: Partial<Omit<Habit, 'id' | 'history'>>) => {
    const updatedHabits = await Promise.all(
      habits.map(async (habit) => {
        if (habit.id === id) {
          const merged = { ...habit, ...updatedFields };
          
          // Re-schedule notifications if reminderTime changed or name changed
          let notificationId = habit.notificationId;
          if (
            settings.notifications.reminders &&
            (updatedFields.reminderTime !== undefined || updatedFields.name !== undefined)
          ) {
            await cancelHabitNotification(habit.notificationId);
            notificationId = await scheduleHabitNotification(id, merged.name, merged.reminderTime);
          }

          return { ...merged, notificationId };
        }
        return habit;
      })
    );
    await saveHabits(updatedHabits);
  };

  // Delete Habit
  const deleteHabit = async (id: string) => {
    const habitToDelete = habits.find((h) => h.id === id);
    if (habitToDelete && habitToDelete.notificationId) {
      await cancelHabitNotification(habitToDelete.notificationId);
    }
    const filtered = habits.filter((h) => h.id !== id);
    await saveHabits(filtered);
  };

  // Update habit progress
  const updateHabitProgress = async (id: string, dateStr: string, progressValue: number, completed?: boolean) => {
    const updatedHabits = habits.map((habit) => {
      if (habit.id === id) {
        const currentRecord = habit.history[dateStr] || { progress: 0, completed: false };
        const newProgress = Math.max(0, progressValue);
        
        // Auto-complete if progress reaches or exceeds target, otherwise use explicitly passed value or existing state
        let isCompleted = completed !== undefined ? completed : currentRecord.completed;
        if (newProgress >= habit.progressTarget) {
          isCompleted = true;
        }

        return {
          ...habit,
          history: {
            ...habit.history,
            [dateStr]: {
              progress: newProgress,
              completed: isCompleted,
            },
          },
        };
      }
      return habit;
    });
    await saveHabits(updatedHabits);
  };

  // Toggle habit completion directly
  const toggleHabitComplete = async (id: string, dateStr: string) => {
    const updatedHabits = habits.map((habit) => {
      if (habit.id === id) {
        const currentRecord = habit.history[dateStr] || { progress: 0, completed: false };
        const nextCompleted = !currentRecord.completed;
        const nextProgress = nextCompleted ? habit.progressTarget : 0;

        return {
          ...habit,
          history: {
            ...habit.history,
            [dateStr]: {
              progress: nextProgress,
              completed: nextCompleted,
            },
          },
        };
      }
      return habit;
    });
    await saveHabits(updatedHabits);
  };

  // Update overall settings (units, language, theme, targets)
  const updateSettings = async (updatedSettings: Partial<UserSettings>) => {
    const nextSettings = { ...settings, ...updatedSettings };
    await saveSettings(nextSettings);

    // If notification reminders toggled off, cancel all. If toggled on, reschedule all.
    if (updatedSettings.notifications) {
      if (!updatedSettings.notifications.reminders) {
        await cancelAllNotifications();
        // Clear all notificationIds
        const updatedHabits = habits.map((h) => ({ ...h, notificationId: null }));
        await saveHabits(updatedHabits);
      } else {
        // Schedule for all
        const updatedHabits = await Promise.all(
          habits.map(async (h) => {
            const notifId = await scheduleHabitNotification(h.id, h.name, h.reminderTime);
            return { ...h, notificationId: notifId };
          })
        );
        await saveHabits(updatedHabits);
      }
    }
  };

  // Update profile specifics
  const updateProfile = async (profileData: Partial<UserProfile>) => {
    const nextSettings = {
      ...settings,
      profile: {
        ...settings.profile,
        ...profileData,
      },
    };
    await saveSettings(nextSettings);
  };

  const refreshStreaks = () => {
    // Just force a rerender, streaks are dynamically calculated anyway
    setHabits([...habits]);
  };

  return (
    <HabitsContext.Provider
      value={{
        habits,
        settings,
        addHabit,
        updateHabit,
        deleteHabit,
        updateHabitProgress,
        toggleHabitComplete,
        updateSettings,
        updateProfile,
        refreshStreaks,
        isLoading,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (context === undefined) {
    throw new Error('useHabits must be used within a HabitsProvider');
  }
  return context;
}
