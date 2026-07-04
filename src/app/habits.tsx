import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme, useActiveColorScheme } from '@/hooks/use-theme';
import { useHabits, getLocalDateString, Habit } from '@/context/habits-context';

const EMOJI_OPTIONS = ['💧', '💻', '📖', '🏋️‍♂️', '🍎', '🧘', '😴', '🧠', '☀️', '🚶‍♂️', '🎵', '🥗'];
const COLOR_OPTIONS = ['#0ea5e9', '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#f97316', '#14b8a6'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitsScreen() {
  const { habits, addHabit, updateHabit, deleteHabit } = useHabits();
  const theme = useTheme();
  const scheme = useActiveColorScheme();
  const router = useRouter();
  const todayStr = getLocalDateString();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'weekdays' | 'custom'>('all');

  // Create Habit Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
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
    
    setCreateModalVisible(false);
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
      progressUnit: editProgressUnit.trim() || 'times',
    });

    setEditingHabit(null);
  };

  const handleDelete = (habit: Habit) => {
    const performDelete = async () => {
      await deleteHabit(habit.id);
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

  const getFreqLabel = (h: Habit) => {
    if (h.frequency === 'daily') return 'Daily';
    if (h.frequency === 'weekdays') return 'Mon–Fri';
    return h.frequency.map((d) => DAYS_OF_WEEK[d]).join(', ');
  };

  // Filter Habits list
  const filteredHabits = habits.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'daily') return h.frequency === 'daily';
    if (activeFilter === 'weekdays') return h.frequency === 'weekdays';
    if (activeFilter === 'custom') return Array.isArray(h.frequency);
    return true;
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={styles.title}>
              Habits Catalog
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Manage and customize your routines
            </ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.two }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search habits..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </ThemedView>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipsScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {(['all', 'daily', 'weekdays', 'custom'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              const label = filter.charAt(0).toUpperCase() + filter.slice(1);
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterChip,
                    isActive ? [styles.filterChipActive, { backgroundColor: theme.text }] : { backgroundColor: theme.backgroundElement }
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.filterChipText, 
                      { color: isActive ? theme.background : theme.textSecondary }
                    ]}
                  >
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Habits list */}
          <View style={styles.listContainer}>
            {filteredHabits.map((habit) => {
              const currentStreak = habit.streakCount ?? 0;
              const todayRecord = habit.history[todayStr] || { progress: 0, completed: false };
              const progressPct = Math.min(100, Math.round((todayRecord.progress / habit.progressTarget) * 100));

              return (
                <TouchableOpacity
                  key={habit.id}
                  activeOpacity={0.9}
                  onPress={() => router.navigate(`/habit/${habit.id}` as any)}
                  style={[
                    styles.habitCard,
                    { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.iconWrapper, { backgroundColor: habit.color + '15' }]}>
                      <ThemedText style={styles.emojiText}>{habit.icon}</ThemedText>
                    </View>
                    <View style={styles.habitMeta}>
                      <ThemedText style={styles.habitName} numberOfLines={1}>{habit.name}</ThemedText>
                      <View style={styles.freqRow}>
                        <Ionicons name="calendar-outline" color={theme.textSecondary} size={11} />
                        <ThemedText themeColor="textSecondary" style={styles.freqText}>
                          {getFreqLabel(habit)}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.bullet}>•</ThemedText>
                        <Ionicons name="time-outline" color={theme.textSecondary} size={11} />
                        <ThemedText themeColor="textSecondary" style={styles.freqText}>
                          {habit.reminderTime}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.cardProgressSection}>
                    <View style={styles.progressLabelRow}>
                      <ThemedText type="small" themeColor="textSecondary">{"Today's Goal"}</ThemedText>
                      <ThemedText type="smallBold" style={{ color: habit.color }}>
                        {todayRecord.progress}/{habit.progressTarget} {habit.progressUnit}
                      </ThemedText>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { backgroundColor: habit.color, width: `${progressPct}%` }]} />
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.streakIndicator}>
                      <Ionicons name="flame" color="#f97316" size={14} />
                      <ThemedText style={styles.streakLabel}>Streak: {currentStreak} days</ThemedText>
                    </View>
                    
                    <View style={styles.buttonsGroup}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleStartEdit(habit);
                        }}
                        style={[styles.actionButton, { borderColor: theme.backgroundSelected }]}
                      >
                        <Ionicons name="pencil" color={theme.text} size={13} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(habit);
                        }}
                        style={[styles.actionButton, styles.deleteButton]}
                      >
                        <Ionicons name="trash" color="#ef4444" size={13} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Empty State */}
            {filteredHabits.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" color={theme.textSecondary} size={48} />
                <ThemedText style={styles.emptyTitle}>
                  {habits.length === 0 ? 'No habits yet' : 'No matches found'}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptySubtitle}>
                  {habits.length === 0 
                    ? 'Start building positive routines by creating your first habit.'
                    : 'Try checking your search spelling or change your active filters.'}
                </ThemedText>
                {habits.length === 0 && (
                  <TouchableOpacity
                    style={[styles.emptyCTA, { backgroundColor: theme.text }]}
                    onPress={() => setCreateModalVisible(true)}
                  >
                    <ThemedText style={[styles.emptyCTAText, { color: theme.background }]}>
                      Create First Habit
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.fab, { backgroundColor: theme.text }]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={theme.background} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Create Habit Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="background" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>New Habit</ThemedText>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close-circle" color={theme.textSecondary} size={26} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>HABIT NAME</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Drink water, read a book..."
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>ICON & COLOR</ThemedText>
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

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>GOAL TARGET & UNIT</ThemedText>
                <View style={styles.targetRow}>
                  <TextInput
                    style={[styles.modalTextInput, styles.targetValueInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    keyboardType="number-pad"
                    value={progressTarget}
                    onChangeText={setProgressTarget}
                  />
                  <TextInput
                    style={[styles.modalTextInput, styles.targetUnitInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    placeholder="glasses, mins, etc."
                    placeholderTextColor={theme.textSecondary}
                    value={progressUnit}
                    onChangeText={setProgressUnit}
                  />
                </View>
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>FREQUENCY</ThemedText>
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

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>REMINDER TIME</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="e.g. 09:00 AM"
                  placeholderTextColor={theme.textSecondary}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: selectedColor }]}
                onPress={handleCreateHabit}
              >
                <ThemedText style={styles.saveBtnText}>Create Habit</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

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
                  <Ionicons name="close-circle" color={theme.textSecondary} size={26} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalInputWrapper}>
                  <ThemedText style={styles.modalInputLabel}>HABIT NAME</ThemedText>
                  <TextInput
                    style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>

                <View style={styles.modalInputWrapper}>
                  <ThemedText style={styles.modalInputLabel}>ICON & COLOR</ThemedText>
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
                  <ThemedText style={styles.modalInputLabel}>GOAL TARGET & UNIT</ThemedText>
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
                  <ThemedText style={styles.modalInputLabel}>FREQUENCY</ThemedText>
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

                <View style={styles.modalInputWrapper}>
                  <ThemedText style={styles.modalInputLabel}>REMINDER TIME</ThemedText>
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
  searchContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0, // Remove Android padding
  },
  filterChipsScroll: {
    marginBottom: Spacing.two,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  filterChip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 22,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    gap: Spacing.three,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 15,
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
    marginHorizontal: 2,
  },
  freqText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardProgressSection: {
    gap: Spacing.one,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    gap: Spacing.one,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  fab: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 13,
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  emptyCTA: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyCTAText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: Spacing.one + 2,
    letterSpacing: 0.5,
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
    fontSize: 15,
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
