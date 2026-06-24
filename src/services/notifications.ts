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

// Schedule notification for a habit
export async function scheduleHabitNotification(
  habitId: string,
  habitName: string,
  timeStr: string
): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;
  
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;
    
    // First, cancel any existing notification for this habit (just in case)
    await cancelHabitNotification(habitId);
    
    const { hour, minute } = parseReminderTime(timeStr);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit Reminder 🌟",
        body: `Time for your habit: "${habitName}"! Let's keep the streak alive.`,
        data: { habitId },
      },
      trigger: {
        type: 'calendar',
        hour,
        minute,
        repeats: true,
      } as any,
    });
    
    return identifier;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

// Cancel a scheduled notification
export async function cancelHabitNotification(notificationId: string | null): Promise<void> {
  if (Platform.OS === 'web' || !Notifications || !notificationId) return;
  
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
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
