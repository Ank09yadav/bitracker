import { Platform } from 'react-native';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    // Configure notifications handler for foreground display
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      }).catch((err: any) => {
        console.warn('Failed to set Android notification channel:', err);
      });
    }
  } catch (error) {
    console.warn('expo-notifications failed to initialize in this environment:', error);
  }
}

// Request permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to check or request notification permissions:', error);
    return false;
  }
}

// Helper to parse reminder time (e.g. "09:00 AM" or "07:30 PM") into 24h format
export function parseReminderTime(timeStr: string): { hour: number; minute: number } {
  try {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { hour: 9, minute: 0 };
    
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    return { hour, minute };
  } catch (error) {
    console.error('Error parsing reminder time:', error);
    return { hour: 9, minute: 0 };
  }
}

// Schedule notification for a habit based on frequency
export async function scheduleHabitNotification(
  habitId: string,
  habitName: string,
  timeStr: string,
  frequency: 'daily' | 'weekdays' | number[]
): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;
  
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;
    
    // First, cancel any existing notification for this habit (just in case)
    await cancelHabitNotification(habitId);
    
    const { hour, minute } = parseReminderTime(timeStr);
    const notificationIds: string[] = [];

    if (frequency === 'daily') {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Habit Reminder 🌟",
          body: `Time for your habit: "${habitName}"! Let's keep the streak alive.`,
          data: { habitId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'habit-reminders',
        } as any,
      });
      notificationIds.push(identifier);
    } else if (frequency === 'weekdays') {
      const weekdayIndices = [2, 3, 4, 5, 6]; // Mon, Tue, Wed, Thu, Fri (1-indexed, 1=Sun, 2=Mon)
      for (const weekday of weekdayIndices) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Habit Reminder 🌟",
            body: `Time for your habit: "${habitName}"! Let's keep the streak alive.`,
            data: { habitId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: 'habit-reminders',
          } as any,
        });
        notificationIds.push(identifier);
      }
    } else if (Array.isArray(frequency)) {
      const weekdayIndices = frequency.map((day) => day + 1); // convert 0-6 to 1-7
      for (const weekday of weekdayIndices) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Habit Reminder 🌟",
            body: `Time for your habit: "${habitName}"! Let's keep the streak alive.`,
            data: { habitId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: 'habit-reminders',
          } as any,
        });
        notificationIds.push(identifier);
      }
    }
    
    return notificationIds.length > 0 ? notificationIds.join(',') : null;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

// Cancel scheduled notifications (supports comma-separated list of IDs)
export async function cancelHabitNotification(notificationId: string | null): Promise<void> {
  if (Platform.OS === 'web' || !Notifications || !notificationId) return;
  
  try {
    const ids = notificationId.split(',');
    for (const id of ids) {
      const trimmedId = id.trim();
      if (trimmedId) {
        await Notifications.cancelScheduledNotificationAsync(trimmedId);
      }
    }
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}
