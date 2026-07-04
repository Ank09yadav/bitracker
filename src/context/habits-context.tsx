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
  scheduledNotificationIds: string[]; // Scheduled notification IDs
  streakCount: number; // Current streak count
  lastCompletedDate: string | null; // Last completed date (YYYY-MM-DD)
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
  addHabit: (habit: Omit<Habit, 'id' | 'history' | 'scheduledNotificationIds' | 'streakCount' | 'lastCompletedDate' | 'createdAt'>) => Promise<void>;
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

// Get last completed date for a habit
export function getLastCompletedDate(habit: Omit<Habit, 'streakCount' | 'lastCompletedDate'>): string | null {
  const completedDates = Object.keys(habit.history)
    .filter((dateKey) => habit.history[dateKey]?.completed)
    .sort();
  return completedDates.length > 0 ? completedDates[completedDates.length - 1] : null;
}

// Calculate streak details for a habit
export function calculateStreak(habit: Omit<Habit, 'streakCount' | 'lastCompletedDate'>, todayStr: string): { currentStreak: number; longestStreak: number } {
  const dates = Object.keys(habit.history).sort();
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const isScheduled = (d: Date) => isHabitScheduledOnDate(habit as Habit, d);
  
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Determine starting point for current streak
  let currentStreak = 0;
  const checkDate = new Date(todayStr);
  const todayFormatted = formatDate(checkDate);
  const todayRecord = habit.history[todayFormatted];

  const startDate = new Date(checkDate);
  if (todayRecord && todayRecord.completed) {
    // Today is completed, start from today
  } else {
    // Today is not completed, start counting from yesterday
    startDate.setDate(startDate.getDate() - 1);
  }

  // Count backward
  const tempDate = new Date(startDate);
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
  const scanDate = new Date(oldestDate);

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
    name: 'New User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
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
          const parsedHabits = JSON.parse(storedHabits) as any[];
          const todayStr = getLocalDateString();
          
          let needsSave = false;
          const updatedHabits: Habit[] = parsedHabits.map((h) => {
            // Handle migration from notificationId (old string) to scheduledNotificationIds (string[])
            let scheduledIds: string[] = h.scheduledNotificationIds || [];
            if (!h.scheduledNotificationIds && h.notificationId) {
              scheduledIds = typeof h.notificationId === 'string' ? h.notificationId.split(',').filter(Boolean) : [];
              needsSave = true;
            }

            const { currentStreak } = calculateStreak(h, todayStr);
            const lastCompleted = getLastCompletedDate(h);

            if (h.streakCount !== currentStreak || h.lastCompletedDate !== lastCompleted || !h.scheduledNotificationIds) {
              needsSave = true;
            }

            return {
              ...h,
              scheduledNotificationIds: scheduledIds,
              streakCount: currentStreak,
              lastCompletedDate: lastCompleted,
            } as Habit;
          });

          setHabits(updatedHabits);
          if (needsSave) {
            await AsyncStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(updatedHabits));
          }
        } else {
          // Start with an empty list (clean slate)
          setHabits([]);
          await AsyncStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify([]));
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
  const addHabit = async (habitData: Omit<Habit, 'id' | 'history' | 'scheduledNotificationIds' | 'streakCount' | 'lastCompletedDate' | 'createdAt'>) => {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    let scheduledNotificationIds: string[] = [];
    if (settings.notifications.reminders) {
      scheduledNotificationIds = await scheduleHabitNotification(id, habitData.name, habitData.reminderTime, habitData.frequency);
    }

    const newHabit: Habit = {
      ...habitData,
      id,
      history: {},
      scheduledNotificationIds,
      streakCount: 0,
      lastCompletedDate: null,
      createdAt,
    };

    await saveHabits([...habits, newHabit]);
  };

  // Update Habit (name, icon, frequency, reminderTime, progressTarget)
  const updateHabit = async (id: string, updatedFields: Partial<Omit<Habit, 'id' | 'history'>>) => {
    const todayStr = getLocalDateString();
    const updatedHabits = await Promise.all(
      habits.map(async (habit) => {
        if (habit.id === id) {
          const merged = { ...habit, ...updatedFields };
          
          // Re-schedule notifications if reminderTime, frequency or name changed
          let scheduledNotificationIds = habit.scheduledNotificationIds || [];
          if (
            settings.notifications.reminders &&
            (updatedFields.reminderTime !== undefined || updatedFields.name !== undefined || updatedFields.frequency !== undefined)
          ) {
            // Cancel old notifications (handles both string and string[] under the hood)
            await cancelHabitNotification(habit.scheduledNotificationIds || (habit as any).notificationId);
            // Schedule new notifications
            scheduledNotificationIds = await scheduleHabitNotification(id, merged.name, merged.reminderTime, merged.frequency);
          }

          // Recalculate streak in case frequency changed
          const { currentStreak } = calculateStreak(merged, todayStr);
          const lastCompleted = getLastCompletedDate(merged);

          return {
            ...merged,
            scheduledNotificationIds,
            streakCount: currentStreak,
            lastCompletedDate: lastCompleted,
          };
        }
        return habit;
      })
    );
    await saveHabits(updatedHabits);
  };

  // Delete Habit
  const deleteHabit = async (id: string) => {
    const habitToDelete = habits.find((h) => h.id === id);
    if (habitToDelete) {
      await cancelHabitNotification(habitToDelete.scheduledNotificationIds || (habitToDelete as any).notificationId);
    }
    const filtered = habits.filter((h) => h.id !== id);
    await saveHabits(filtered);
  };

  // Update habit progress
  const updateHabitProgress = async (id: string, dateStr: string, progressValue: number, completed?: boolean) => {
    const todayStr = getLocalDateString();
    const updatedHabits = habits.map((habit) => {
      if (habit.id === id) {
        const currentRecord = habit.history[dateStr] || { progress: 0, completed: false };
        const newProgress = Math.max(0, progressValue);
        
        // Auto-complete if progress reaches or exceeds target, otherwise use explicitly passed value or existing state
        let isCompleted = completed !== undefined ? completed : currentRecord.completed;
        if (newProgress >= habit.progressTarget) {
          isCompleted = true;
        }

        const updatedHistory = {
          ...habit.history,
          [dateStr]: {
            progress: newProgress,
            completed: isCompleted,
          },
        };

        const tempHabit = {
          ...habit,
          history: updatedHistory,
        };

        const { currentStreak } = calculateStreak(tempHabit, todayStr);
        const lastCompleted = getLastCompletedDate(tempHabit);

        return {
          ...tempHabit,
          streakCount: currentStreak,
          lastCompletedDate: lastCompleted,
        };
      }
      return habit;
    });
    await saveHabits(updatedHabits);
  };

  // Toggle habit completion directly
  const toggleHabitComplete = async (id: string, dateStr: string) => {
    const todayStr = getLocalDateString();
    const updatedHabits = habits.map((habit) => {
      if (habit.id === id) {
        const currentRecord = habit.history[dateStr] || { progress: 0, completed: false };
        const nextCompleted = !currentRecord.completed;
        const nextProgress = nextCompleted ? habit.progressTarget : 0;

        const updatedHistory = {
          ...habit.history,
          [dateStr]: {
            progress: nextProgress,
            completed: nextCompleted,
          },
        };

        const tempHabit = {
          ...habit,
          history: updatedHistory,
        };

        const { currentStreak } = calculateStreak(tempHabit, todayStr);
        const lastCompleted = getLastCompletedDate(tempHabit);

        return {
          ...tempHabit,
          streakCount: currentStreak,
          lastCompletedDate: lastCompleted,
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
        // Clear all scheduledNotificationIds
        const updatedHabits = habits.map((h) => ({ ...h, scheduledNotificationIds: [], notificationId: null } as Habit));
        await saveHabits(updatedHabits);
      } else {
        // Schedule for all
        const updatedHabits = await Promise.all(
          habits.map(async (h) => {
            const notifIds = await scheduleHabitNotification(h.id, h.name, h.reminderTime, h.frequency);
            return { ...h, scheduledNotificationIds: notifIds } as Habit;
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
