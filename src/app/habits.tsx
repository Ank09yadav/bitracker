import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHabits, getLocalDateString, calculateStreak, Habit } from '@/context/habits-context';

const EMOJI_OPTIONS = ['💧', '💻', '📖', '🏋️‍♂️', '🍎', '🧘', '😴', '🧠', '☀️', '🚶‍♂️', '🎵', '🥗'];
const COLOR_OPTIONS = ['#0ea5e9', '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#f97316', '#14b8a6'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitsScreen() {
  const { habits, addHabit, updateHabit, deleteHabit } = useHabits();
  const theme = useTheme();
  const scheme = useColorScheme();
  const todayStr = getLocalDateString();

  // Add Habit Form State
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💧');
  const [selectedColor, setSelectedColor] = useState('#0ea5e9');
  const [freqType, setFreqType] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri by default
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [progressTarget, setProgressTarget] = useState('8');
  const [progressUnit, setProgressUnit] = useState('glasses');

  // Edit Habit Modal State
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('💧');
  const [editColor, setEditColor] = useState('#0ea5e9');
  const [editFreqType, setEditFreqType] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  const [editCustomDays, setEditCustomDays] = useState<number[]>([]);
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editProgressTarget, setEditProgressTarget] = useState('');
  const [editProgressUnit, setEditProgressUnit] = useState('');

  const handleCreateHabit = async () => {
    if (!name.trim()) return;

    let frequency: 'daily' | 'weekdays' | number[] = 'daily';
    if (freqType === 'weekdays') frequency = 'weekdays';
    else if (freqType === 'custom') frequency = customDays;

    await addHabit({
      name: name.trim(),
      icon: selectedEmoji,
      color: selectedColor,
      frequency,
      reminderTime,
      progressTarget: parseInt(progressTarget, 10) || 1,
      progressUnit: progressUnit.trim() || 'times',
    });

    // Reset Form
    setName('');
    setSelectedEmoji('💧');
    setSelectedColor('#0ea5e9');
    setFreqType('daily');
    setCustomDays([1, 3, 5]);
    setReminderTime('09:00 AM');
    setProgressTarget('8');
    setProgressUnit('glasses');
  };

  const handleStartEdit = (habit: Habit) => {
    setEditingHabit(habit);
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
  };

  const handleSaveEdit = async () => {
    if (!editingHabit || !editName.trim()) return;

    let frequency: 'daily' | 'weekdays' | number[] = 'daily';
    if (editFreqType === 'weekdays') frequency = 'weekdays';
    else if (editFreqType === 'custom') frequency = editCustomDays;

    await updateHabit(editingHabit.id, {
      name: editName.trim(),
      icon: editEmoji,
      color: editColor,
      frequency,
      reminderTime: editReminderTime,
      progressTarget: parseInt(editProgressTarget, 10) || 1,
      progressUnit: editProgressUnit,
    });

    setEditingHabit(null);
  };

  const toggleCustomDay = (dayIndex: number) => {
    if (customDays.includes(dayIndex)) {
      setCustomDays(customDays.filter((d) => d !== dayIndex));
    } else {
      setCustomDays([...customDays, dayIndex].sort());
    }
  };

  const toggleEditCustomDay = (dayIndex: number) => {
    if (editCustomDays.includes(dayIndex)) {
      setEditCustomDays(editCustomDays.filter((d) => d !== dayIndex));
    } else {
      setEditCustomDays([...editCustomDays, dayIndex].sort());
    }
  };

  const getFreqLabel = (habit: Habit) => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekdays') return 'Mon–Fri';
    return habit.frequency.map((d) => DAYS_OF_WEEK[d]).join(', ');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>
              Habits
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Manage your daily routines and reminders
            </ThemedText>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Habits list */}
          <View style={styles.listContainer}>
            {habits.map((habit) => {
              const { currentStreak } = calculateStreak(habit, todayStr);
              return (
                <View
                  key={habit.id}
                  style={[
                    styles.habitCard,
                    { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }
                  ]}
                >
                  <View style={styles.cardMainRow}>
                    <View style={[styles.iconWrapper, { backgroundColor: habit.color + '15' }]}>
                      <ThemedText style={styles.emojiText}>{habit.icon}</ThemedText>
                    </View>
                    <View style={styles.habitMeta}>
                      <ThemedText style={styles.habitName}>{habit.name}</ThemedText>
                      <View style={styles.freqRow}>
                        <ThemedText themeColor="textSecondary" style={styles.freqText}>
                          {getFreqLabel(habit)}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.bullet}>
                          •
                        </ThemedText>
                        <SymbolView name="alarm" tintColor={theme.textSecondary} size={12} />
                        <ThemedText themeColor="textSecondary" style={styles.freqText}>
                          {habit.reminderTime}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.streakIndicator}>
                    <SymbolView name="flame.fill" tintColor="#f97316" size={14} />
                    <ThemedText style={styles.streakLabel}>Current streak</ThemedText>
                    <ThemedText style={styles.streakValue}>{currentStreak} days</ThemedText>
                  </View>

                  <View style={styles.actionRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Swipe left to delete
                    </ThemedText>
                    <View style={styles.buttonsGroup}>
                      <TouchableOpacity
                        onPress={() => handleStartEdit(habit)}
                        style={styles.actionButton}
                      >
                        <SymbolView name="pencil" tintColor={theme.text} size={14} />
                        <ThemedText style={styles.actionBtnText}>Edit</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => deleteHabit(habit.id)}
                        style={[styles.actionButton, styles.deleteButton]}
                      >
                        <SymbolView name="trash" tintColor="#ef4444" size={14} />
                        <ThemedText style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Add a new habit form */}
          <ThemedView type="backgroundElement" style={styles.formCard}>
            <View style={styles.formHeader}>
              <View>
                <ThemedText style={styles.formTitle}>Add a new habit</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.formSubTitle}>
                  Name, icon, frequency, and reminders
                </ThemedText>
              </View>
              <TouchableOpacity onPress={handleCreateHabit} style={styles.fabPlus}>
                <SymbolView name="plus" tintColor="#ffffff" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputsGrid}>
              {/* Row 1: Name & Target */}
              <View style={styles.formRow}>
                <View style={styles.inputWrapper}>
                  <ThemedText themeColor="textSecondary" style={styles.inputLabel}>
                    🏷️ Name
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    placeholder="Drink Water, workout..."
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <ThemedText themeColor="textSecondary" style={styles.inputLabel}>
                    🎯 Target Goal
                  </ThemedText>
                  <View style={styles.targetRow}>
                    <TextInput
                      style={[styles.textInput, styles.targetValueInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      keyboardType="number-pad"
                      value={progressTarget}
                      onChangeText={setProgressTarget}
                    />
                    <TextInput
                      style={[styles.textInput, styles.targetUnitInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                      placeholder="unit"
                      placeholderTextColor={theme.textSecondary}
                      value={progressUnit}
                      onChangeText={setProgressUnit}
                    />
                  </View>
                </View>
              </View>

              {/* Row 2: Emoji selection */}
              <View style={styles.emojiColorSection}>
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>
                  😀 Select Emoji & Color
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setSelectedEmoji(emoji)}
                      style={[
                        styles.emojiPickerItem,
                        selectedEmoji === emoji && { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 20 }}>{emoji}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.colorPalette}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorBall,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorBallSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Row 3: Frequency settings */}
              <View style={styles.inputWrapper}>
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>
                  🗓️ Frequency
                </ThemedText>
                <View style={styles.segmentedControl}>
                  {(['daily', 'weekdays', 'custom'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFreqType(type)}
                      style={[
                        styles.segmentButton,
                        freqType === type && [styles.segmentButtonActive, { backgroundColor: selectedColor }],
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.segmentText,
                          freqType === type && { color: '#ffffff' },
                        ]}
                      >
                        {type === 'daily' ? 'Daily' : type === 'weekdays' ? 'Weekdays' : 'Custom'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {freqType === 'custom' && (
                  <View style={styles.customDaysGrid}>
                    {DAYS_OF_WEEK.map((dayName, index) => {
                      const isActive = customDays.includes(index);
                      return (
                        <TouchableOpacity
                          key={dayName}
                          onPress={() => toggleCustomDay(index)}
                          style={[
                            styles.dayBox,
                            isActive && { backgroundColor: selectedColor },
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

              {/* Row 4: Reminder time */}
              <View style={styles.inputWrapper}>
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>
                  ⏰ Reminder Time
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. 09:00 AM"
                  placeholderTextColor={theme.textSecondary}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                />
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Habit Modal */}
      {editingHabit && (
        <Modal
          visible={editingHabit !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingHabit(null)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="background" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Edit Habit</ThemedText>
                <TouchableOpacity onPress={() => setEditingHabit(null)}>
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

                {/* Emojis selection */}
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

                {/* Colors selection */}
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

                {/* Target */}
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

                {/* Frequency */}
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
                            onPress={() => toggleEditCustomDay(index)}
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

                {/* Reminder time */}
                <View style={styles.modalInputWrapper}>
                  <ThemedText style={styles.modalInputLabel}>Reminder Time</ThemedText>
                  <TextInput
                    style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={editReminderTime}
                    onChangeText={setEditReminderTime}
                  />
                </View>

                {/* Save button */}
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.half,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  listContainer: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  habitCard: {
    borderRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  habitMeta: {
    marginLeft: Spacing.three,
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '700',
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  bullet: {
    fontSize: 12,
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    marginVertical: Spacing.three,
    gap: Spacing.two,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9a3412',
    flex: 1,
  },
  streakValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 28,
    padding: Spacing.four,
    marginTop: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  formSubTitle: {
    fontSize: 12,
    marginTop: Spacing.half,
    fontWeight: '500',
  },
  fabPlus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputsGrid: {
    gap: Spacing.three,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
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
  emojiColorSection: {
    gap: Spacing.one,
  },
  horizontalScroll: {
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  emojiPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
});
