import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHabits, getLocalDateString, isHabitScheduledOnDate, calculateStreak } from '@/context/habits-context';

export default function TodayScreen() {
  const { habits, settings, toggleHabitComplete, updateHabitProgress } = useHabits();
  const theme = useTheme();
  const scheme = useColorScheme();
  
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [progressInput, setProgressInput] = useState<string>('');

  const todayStr = getLocalDateString();
  const todayDate = new Date();

  // Filter habits scheduled for today
  const todayHabits = habits.filter((h) => isHabitScheduledOnDate(h, todayDate));

  // Calculate completion percentage
  const totalToday = todayHabits.length;
  const completedToday = todayHabits.filter((h) => h.history[todayStr]?.completed).length;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Format today's date (e.g., "Tuesday, June 24")
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    return todayDate.toLocaleDateString('en-US', options);
  };

  const getGreeting = () => {
    const hr = todayDate.getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Open modal for modifying progress
  const openProgressModal = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const currentProgress = habit.history[todayStr]?.progress || 0;
    setSelectedHabitId(habitId);
    setProgressInput(currentProgress.toString());
  };

  const handleSaveProgress = () => {
    if (!selectedHabitId) return;
    const value = parseInt(progressInput, 10);
    if (!isNaN(value)) {
      updateHabitProgress(selectedHabitId, todayStr, value);
    }
    setSelectedHabitId(null);
  };

  const activeHabit = habits.find((h) => h.id === selectedHabitId);

  // SVG Progress Arc calculation
  const circleSize = 130;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header section */}
        <View style={styles.header}>
          <View>
            <ThemedText themeColor="textSecondary" style={styles.greeting}>
              {getGreeting()}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.todayTitle}>
              Today
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.dateSub}>
              {getFormattedDate()}
            </ThemedText>
          </View>
          <Image
            source={{ uri: settings.profile.avatar }}
            style={styles.avatar}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Completion summary card */}
          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            <View style={styles.progressCircleContainer}>
              <Svg width={circleSize} height={circleSize}>
                <Circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke={scheme === 'dark' ? '#2E3135' : '#E0E1E6'}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
                />
              </Svg>
              <View style={styles.progressTextOverlay}>
                <ThemedText type="subtitle" style={styles.percentText}>
                  {completionRate}%
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.doneText}>
                  {completedToday} of {totalToday} done
                </ThemedText>
              </View>
            </View>

            <View style={styles.summaryTextContainer}>
              <View style={styles.badge}>
                <SymbolView name="sparkles" tintColor="#eab308" size={12} />
                <ThemedText type="code" style={styles.badgeText}>
                  Keep the momentum going
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary" style={styles.summaryText}>
                {completionRate === 100
                  ? "Perfect day! You have completed all scheduled habits. Great job!"
                  : `You are building a strong streak. Complete your remaining habits to close the day with a win.`}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Active habits list */}
          <View style={styles.habitsList}>
            {todayHabits.map((habit) => {
              const record = habit.history[todayStr] || { progress: 0, completed: false };
              const { currentStreak } = calculateStreak(habit, todayStr);
              
              return (
                <Pressable
                  key={habit.id}
                  onPress={() => openProgressModal(habit.id)}
                  style={({ pressed }) => [
                    styles.habitCard,
                    { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.habitIconContainer, { backgroundColor: habit.color + '15' }]}>
                    <ThemedText style={styles.habitEmoji}>{habit.icon}</ThemedText>
                  </View>

                  <View style={styles.habitInfo}>
                    <ThemedText style={styles.habitName} numberOfLines={1}>
                      {habit.name}
                    </ThemedText>
                    <View style={styles.habitMeta}>
                      <ThemedText themeColor="textSecondary" style={styles.streakText}>
                        🔥 {currentStreak} day streak
                      </ThemedText>
                      <ThemedView type="backgroundSelected" style={styles.progressBadge}>
                        <ThemedText themeColor="textSecondary" style={styles.progressBadgeText}>
                          {record.progress} of {habit.progressTarget} {habit.progressUnit}
                        </ThemedText>
                      </ThemedView>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleHabitComplete(habit.id, todayStr)}
                    style={[
                      styles.checkCircle,
                      record.completed && [styles.checkCircleCompleted, { backgroundColor: habit.color }],
                      { borderColor: record.completed ? habit.color : '#cbd5e1' },
                    ]}
                  >
                    {record.completed && (
                      <SymbolView name="checkmark" tintColor="#ffffff" size={14} />
                    )}
                  </TouchableOpacity>
                </Pressable>
              );
            })}

            {todayHabits.length === 0 && (
              <View style={styles.emptyContainer}>
                <SymbolView name="calendar.badge.plus" tintColor="#94a3b8" size={32} />
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No habits scheduled for today. Go to the Habits tab to schedule some!
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Progress Adjustment Modal */}
      {activeHabit && (
        <Modal
          visible={selectedHabitId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedHabitId(null)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="background" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Update Progress</ThemedText>
                <TouchableOpacity onPress={() => setSelectedHabitId(null)}>
                  <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={[styles.modalIconContainer, { backgroundColor: activeHabit.color + '20' }]}>
                  <ThemedText style={styles.modalEmoji}>{activeHabit.icon}</ThemedText>
                </View>
                <ThemedText style={styles.modalHabitName}>{activeHabit.name}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.modalTargetText}>
                  Target: {activeHabit.progressTarget} {activeHabit.progressUnit}
                </ThemedText>

                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const val = Math.max(0, parseInt(progressInput, 10) - 1);
                      setProgressInput(val.toString());
                    }}
                  >
                    <ThemedText style={styles.counterBtnText}>-</ThemedText>
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.modalInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    keyboardType="number-pad"
                    value={progressInput}
                    onChangeText={setProgressInput}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const val = parseInt(progressInput, 10) + 1;
                      setProgressInput(val.toString());
                    }}
                  >
                    <ThemedText style={styles.counterBtnText}>+</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalSaveButton, { backgroundColor: activeHabit.color }]}
                    onPress={handleSaveProgress}
                  >
                    <ThemedText style={styles.saveBtnText}>Save Progress</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  todayTitle: {
    fontWeight: '800',
    marginTop: Spacing.half,
  },
  dateSub: {
    fontSize: 14,
    marginTop: Spacing.half,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  summaryCard: {
    borderRadius: 24,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginVertical: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  progressCircleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTextOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 26,
  },
  doneText: {
    fontSize: 9,
    marginTop: Spacing.half,
    fontWeight: '600',
  },
  summaryTextContainer: {
    flex: 1,
    gap: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: Spacing.one,
  },
  badgeText: {
    fontSize: 10,
    color: '#a16207',
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  habitsList: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  habitIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitEmoji: {
    fontSize: 22,
  },
  habitInfo: {
    flex: 1,
    marginLeft: Spacing.three,
    justifyContent: 'center',
  },
  habitName: {
    fontSize: 16,
    fontWeight: '700',
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.half,
    gap: Spacing.two,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.two,
  },
  checkCircleCompleted: {
    borderWidth: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    maxWidth: 240,
    lineHeight: 20,
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
    paddingBottom: Platform.OS === 'ios' ? Spacing.six : Spacing.four,
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
  modalBody: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalEmoji: {
    fontSize: 36,
  },
  modalHabitName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.half,
  },
  modalTargetText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.four,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.five,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff1f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalInput: {
    width: 80,
    height: 48,
    borderWidth: 1,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  modalActions: {
    width: '100%',
    gap: Spacing.three,
  },
  modalSaveButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
