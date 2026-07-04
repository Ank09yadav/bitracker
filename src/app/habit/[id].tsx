import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme, useActiveColorScheme } from '@/hooks/use-theme';
import { useHabits, getLocalDateString, calculateStreak, isHabitScheduledOnDate, Habit } from '@/context/habits-context';

const EMOJI_OPTIONS = ['💧', '💻', '📖', '🏋️‍♂️', '🍎', '🧘', '😴', '🧠', '☀️', '🚶‍♂️', '🎵', '🥗'];
const COLOR_OPTIONS = ['#0ea5e9', '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#f97316', '#14b8a6'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const scheme = useActiveColorScheme();
  const todayStr = getLocalDateString();
  const todayDate = new Date();

  const { habits, updateHabitProgress, toggleHabitComplete, deleteHabit, updateHabit } = useHabits();
  
  // Find current habit
  const habit = habits.find((h) => h.id === id);

  // Edit Habit Form State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('💧');
  const [editColor, setEditColor] = useState('#0ea5e9');
  const [editFreqType, setEditFreqType] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  const [editCustomDays, setEditCustomDays] = useState<number[]>([]);
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editProgressTarget, setEditProgressTarget] = useState('');
  const [editProgressUnit, setEditProgressUnit] = useState('');

  if (!habit) {
    return (
      <ThemedView style={styles.errorContainer}>
        <SymbolView name="exclamationmark.triangle.fill" tintColor="#ef4444" size={48} />
        <ThemedText style={styles.errorTitle}>Habit Not Found</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.errorSubtitle}>
          This habit may have been deleted.
        </ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const { currentStreak, longestStreak } = calculateStreak(habit, todayStr);
  const todayRecord = habit.history[todayStr] || { progress: 0, completed: false };
  const completionPercentage = habit.progressTarget > 0 
    ? Math.min(100, Math.round((todayRecord.progress / habit.progressTarget) * 100))
    : 0;

  const handleStartEdit = () => {
    setEditName(habit.name);
    setEditEmoji(habit.icon);
    setEditColor(habit.color);
    if (habit.frequency === 'daily') setEditFreqType('daily');
    else if (habit.frequency === 'weekdays') setEditFreqType('weekdays');
    else {
      setEditFreqType('custom');
      setEditCustomDays(habit.frequency);
    }
    setEditReminderTime(habit.reminderTime);
    setEditProgressTarget(habit.progressTarget.toString());
    setEditProgressUnit(habit.progressUnit);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    let frequency: 'daily' | 'weekdays' | number[] = 'daily';
    if (editFreqType === 'weekdays') frequency = 'weekdays';
    else if (editFreqType === 'custom') frequency = editCustomDays;

    await updateHabit(habit.id, {
      name: editName.trim(),
      icon: editEmoji,
      color: editColor,
      frequency,
      reminderTime: editReminderTime,
      progressTarget: parseInt(editProgressTarget, 10) || 1,
      progressUnit: editProgressUnit.trim() || 'times',
    });

    setEditModalVisible(false);
  };

  const handleDelete = () => {
    const performDelete = async () => {
      await deleteHabit(habit.id);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete "${habit.name}"? This cannot be undone.`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Habit',
        `Are you sure you want to delete "${habit.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const adjustProgress = (amount: number) => {
    const newProgress = Math.max(0, todayRecord.progress + amount);
    updateHabitProgress(habit.id, todayStr, newProgress);
  };

  const toggleCustomDay = (dayIndex: number) => {
    if (editCustomDays.includes(dayIndex)) {
      setEditCustomDays(editCustomDays.filter((d) => d !== dayIndex));
    } else {
      setEditCustomDays([...editCustomDays, dayIndex].sort());
    }
  };

  const getFreqLabel = (h: Habit) => {
    if (h.frequency === 'daily') return 'Daily';
    if (h.frequency === 'weekdays') return 'Mon–Fri';
    return h.frequency.map((d) => DAYS_OF_WEEK[d]).join(', ');
  };

  // Month consistency grid calculation
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = todayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const historyDays = [];
  // Empty blocks for offset
  for (let i = 0; i < startDayOfWeek; i++) {
    historyDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    const dateStr = getLocalDateString(d);
    const scheduled = isHabitScheduledOnDate(habit, d);
    const record = habit.history[dateStr];
    const completed = record?.completed ?? false;
    const isToday = dateStr === todayStr;
    const isPast = d < todayDate && !isToday;

    historyDays.push({
      dayNum: day,
      dateStr,
      scheduled,
      completed,
      isToday,
      isPast,
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <SymbolView name="chevron.left" tintColor={theme.text} size={24} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            Habit Details
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleStartEdit} style={styles.iconButton}>
              <SymbolView name="pencil" tintColor={theme.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.iconButton, styles.deleteHeaderBtn]}>
              <SymbolView name="trash" tintColor="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Info Card */}
          <View style={[styles.mainCard, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
            <View style={[styles.iconWrapper, { backgroundColor: habit.color + '15' }]}>
              <ThemedText style={styles.emojiText}>{habit.icon}</ThemedText>
            </View>
            <ThemedText style={styles.habitName}>{habit.name}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.freqLabel}>
              {getFreqLabel(habit)} • ⏰ {habit.reminderTime}
            </ThemedText>
          </View>

          {/* Today's Tracking Controls */}
          {isHabitScheduledOnDate(habit, todayDate) ? (
            <ThemedView type="backgroundElement" style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <ThemedText style={styles.controlTitle}>{"Today's Progress"}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.controlProgressLabel}>
                  {todayRecord.progress} of {habit.progressTarget} {habit.progressUnit}
                </ThemedText>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      backgroundColor: habit.color, 
                      width: `${completionPercentage}%` 
                    }
                  ]} 
                />
              </View>

              <View style={styles.controlActions}>
                <View style={styles.counterGroup}>
                  <TouchableOpacity onPress={() => adjustProgress(-1)} style={styles.counterBtn}>
                    <SymbolView name="minus" tintColor={theme.text} size={16} />
                  </TouchableOpacity>
                  <ThemedText style={styles.counterValue}>{todayRecord.progress}</ThemedText>
                  <TouchableOpacity onPress={() => adjustProgress(1)} style={styles.counterBtn}>
                    <SymbolView name="plus" tintColor={theme.text} size={16} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  onPress={() => toggleHabitComplete(habit.id, todayStr)}
                  style={[
                    styles.completeBtn, 
                    { backgroundColor: todayRecord.completed ? '#10b981' : habit.color }
                  ]}
                >
                  <SymbolView 
                    name={todayRecord.completed ? "checkmark.circle.fill" : "circle"} 
                    tintColor="#ffffff" 
                    size={18} 
                  />
                  <ThemedText style={styles.completeBtnText}>
                    {todayRecord.completed ? 'Completed' : 'Mark Completed'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          ) : (
            <View style={styles.nonScheduledBanner}>
              <SymbolView name="calendar.badge.exclamationmark" tintColor="#94a3b8" size={24} />
              <ThemedText themeColor="textSecondary" style={styles.nonScheduledText}>
                This habit is not scheduled for today.
              </ThemedText>
            </View>
          )}

          {/* Streak Metrics */}
          <View style={styles.streakGrid}>
            <ThemedView type="backgroundElement" style={styles.streakCard}>
              <SymbolView name="flame.fill" tintColor="#f97316" size={24} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.streakCardLabel}>
                CURRENT STREAK
              </ThemedText>
              <ThemedText style={styles.streakCardValue}>{currentStreak} days</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.streakCard}>
              <SymbolView name="trophy.fill" tintColor="#eab308" size={24} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.streakCardLabel}>
                LONGEST STREAK
              </ThemedText>
              <ThemedText style={styles.streakCardValue}>{longestStreak} days</ThemedText>
            </ThemedView>
          </View>

          {/* Month Completion History */}
          <ThemedView type="backgroundElement" style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <SymbolView name="calendar" tintColor={theme.text} size={18} />
              <ThemedText style={styles.historyTitle}>{monthName}</ThemedText>
            </View>

            {/* Weekday labels */}
            <View style={styles.weekdayLabelsRow}>
              {DAYS_OF_WEEK.map((d) => (
                <ThemedText key={d} themeColor="textSecondary" style={styles.weekdayLabel}>
                  {d[0]}
                </ThemedText>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.calendarGrid}>
              {historyDays.map((item, index) => {
                if (item === null) {
                  return <View key={`empty-${index}`} style={styles.calendarDayCellEmpty} />;
                }

                let cellBg: string = 'transparent';
                let cellBorder: string = 'rgba(148, 163, 184, 0.2)';
                let textColor: string = theme.text;

                if (item.completed) {
                  cellBg = '#10b981';
                  cellBorder = '#10b981';
                  textColor = '#ffffff';
                } else if (item.scheduled) {
                  if (item.isToday) {
                    cellBorder = habit.color;
                  } else if (item.isPast) {
                    // Missed scheduled day
                    cellBg = scheme === 'dark' ? '#3c1c1c' : '#fee2e2';
                    cellBorder = '#f87171';
                    textColor = '#ef4444';
                  }
                } else {
                  // Non-scheduled day
                  textColor = theme.textSecondary;
                  cellBg = scheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
                }

                return (
                  <View 
                    key={item.dateStr} 
                    style={[
                      styles.calendarDayCell, 
                      { backgroundColor: cellBg, borderColor: cellBorder }
                    ]}
                  >
                    <ThemedText style={[styles.dayNumText, { color: textColor, fontWeight: item.isToday ? '800' : '600' }]}>
                      {item.dayNum}
                    </ThemedText>
                    {item.isToday && !item.completed && (
                      <View style={[styles.todayIndicatorDot, { backgroundColor: habit.color }]} />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
                <ThemedText type="small" themeColor="textSecondary">Completed</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: scheme === 'dark' ? '#3c1c1c' : '#fee2e2', borderColor: '#f87171', borderWidth: 1 }]} />
                <ThemedText type="small" themeColor="textSecondary">Missed</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: 'transparent', borderColor: 'rgba(148,163,184,0.2)', borderWidth: 1 }]} />
                <ThemedText type="small" themeColor="textSecondary">Rest / Off</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Details & Metadata Card */}
          <ThemedView type="backgroundElement" style={styles.detailsCard}>
            <ThemedText style={styles.detailsCardTitle}>Habit Settings</ThemedText>
            
            <View style={styles.detailRow}>
              <ThemedText themeColor="textSecondary">Frequency</ThemedText>
              <ThemedText style={styles.detailVal}>{getFreqLabel(habit)}</ThemedText>
            </View>
            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <ThemedText themeColor="textSecondary">Reminder</ThemedText>
              <ThemedText style={styles.detailVal}>{habit.reminderTime}</ThemedText>
            </View>
            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <ThemedText themeColor="textSecondary">Target Goal</ThemedText>
              <ThemedText style={styles.detailVal}>
                {habit.progressTarget} {habit.progressUnit} per session
              </ThemedText>
            </View>
            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <ThemedText themeColor="textSecondary">Alert Notifications</ThemedText>
              <ThemedText style={styles.detailVal}>
                {habit.scheduledNotificationIds?.length > 0 
                  ? `${habit.scheduledNotificationIds.length} scheduled`
                  : 'Disabled'}
              </ThemedText>
            </View>
            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <ThemedText themeColor="textSecondary">Created</ThemedText>
              <ThemedText style={styles.detailVal}>
                {new Date(habit.createdAt).toLocaleDateString()}
              </ThemedText>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Habit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="background" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Habit</ThemedText>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Habit Name</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Emoji Icon</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setEditEmoji(emoji)}
                      style={[
                        styles.emojiPickerItem,
                        editEmoji === emoji && { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 20 }}>{emoji}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Theme Color</ThemedText>
                <View style={styles.colorPalette}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setEditColor(color)}
                      style={[
                        styles.colorBall,
                        { backgroundColor: color },
                        editColor === color && styles.colorBallSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Goal Target & Unit</ThemedText>
                <View style={styles.targetRow}>
                  <TextInput
                    style={[styles.modalTextInput, styles.targetValueInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    keyboardType="number-pad"
                    value={editProgressTarget}
                    onChangeText={setEditProgressTarget}
                  />
                  <TextInput
                    style={[styles.modalTextInput, styles.targetUnitInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={editProgressUnit}
                    onChangeText={setEditProgressUnit}
                  />
                </View>
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Frequency</ThemedText>
                <View style={styles.segmentedControl}>
                  {(['daily', 'weekdays', 'custom'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setEditFreqType(type)}
                      style={[
                        styles.segmentButton,
                        editFreqType === type && [styles.segmentButtonActive, { backgroundColor: editColor }],
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.segmentText,
                          editFreqType === type && { color: '#ffffff' },
                        ]}
                      >
                        {type === 'daily' ? 'Daily' : type === 'weekdays' ? 'Weekdays' : 'Custom'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {editFreqType === 'custom' && (
                  <View style={styles.customDaysGrid}>
                    {DAYS_OF_WEEK.map((dayName, index) => {
                      const isActive = editCustomDays.includes(index);
                      return (
                        <TouchableOpacity
                          key={dayName}
                          onPress={() => toggleCustomDay(index)}
                          style={[
                            styles.dayBox,
                            isActive && { backgroundColor: editColor },
                            { borderColor: theme.backgroundSelected },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.dayText,
                              isActive && { color: '#ffffff', fontWeight: '700' },
                            ]}
                          >
                            {dayName[0]}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Reminder Time</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={editReminderTime}
                  onChangeText={setEditReminderTime}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: editColor }]}
                onPress={handleSaveEdit}
              >
                <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  backButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  backButtonText: {
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  deleteHeaderBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing.three,
  },
  mainCard: {
    alignItems: 'center',
    borderRadius: 24,
    padding: Spacing.five,
    textAlign: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  emojiText: {
    fontSize: 32,
  },
  habitName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.half,
  },
  freqLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  controlCard: {
    borderRadius: 24,
    padding: Spacing.four,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  controlProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  controlActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    padding: Spacing.half,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  counterValue: {
    width: 40,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  completeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nonScheduledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    padding: Spacing.three,
    justifyContent: 'center',
  },
  nonScheduledText: {
    fontSize: 13,
    fontWeight: '600',
  },
  streakGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  streakCard: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  streakCardLabel: {
    fontWeight: '700',
    marginTop: Spacing.half,
  },
  streakCardValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  historyCard: {
    borderRadius: 24,
    padding: Spacing.four,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekdayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  weekdayLabel: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  calendarDayCell: {
    width: (Dimensions.get('window').width - 32 - 32 - 24) / 7, // Adjust for margins
    maxWidth: 42,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayCellEmpty: {
    width: (Dimensions.get('window').width - 32 - 32 - 24) / 7,
    maxWidth: 42,
    aspectRatio: 1,
  },
  dayNumText: {
    fontSize: 11,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 3,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  detailsCard: {
    borderRadius: 24,
    padding: Spacing.four,
  },
  detailsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.four,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalInputWrapper: {
    marginBottom: Spacing.three,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: Spacing.one,
  },
  modalTextInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  targetRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  targetValueInput: {
    width: 60,
    textAlign: 'center',
  },
  targetUnitInput: {
    flex: 1,
  },
  emojiPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalScroll: {
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  colorBall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorBallSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    padding: Spacing.half,
    height: 44,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customDaysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  dayBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
