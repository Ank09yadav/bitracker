import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/context/habits-context';

export default function ProfileScreen() {
  const { settings, updateSettings, updateProfile, habits } = useHabits();
  const theme = useTheme();
  const scheme = useColorScheme();

  // Edit Profile Modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [tempName, setTempName] = useState(settings.profile.name);
  const [tempAvatar, setTempAvatar] = useState(settings.profile.avatar);

  // Edit Goals Modal
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [tempDailyGoal, setTempDailyGoal] = useState(settings.dailyGoalTarget.toString());
  const [tempWeeklyObj, setTempWeeklyObj] = useState(settings.weeklyObjective.toString());

  // Count active habits
  const activeHabitsCount = habits.length;

  const handleSaveProfile = () => {
    updateProfile({
      name: tempName.trim() || 'User',
      avatar: tempAvatar.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    });
    setProfileModalVisible(false);
  };

  const handleSaveGoals = () => {
    const daily = parseInt(tempDailyGoal, 10);
    const weekly = parseInt(tempWeeklyObj, 10);
    updateSettings({
      dailyGoalTarget: !isNaN(daily) ? daily : settings.dailyGoalTarget,
      weeklyObjective: !isNaN(weekly) ? weekly : settings.weeklyObjective,
    });
    setGoalsModalVisible(false);
  };

  const handleToggleTheme = () => {
    // Cycles: light -> dark -> system -> light
    let nextTheme: 'light' | 'dark' | 'system' = 'light';
    if (settings.theme === 'light') nextTheme = 'dark';
    else if (settings.theme === 'dark') nextTheme = 'system';
    
    updateSettings({ theme: nextTheme });
  };

  const handleToggleNotifications = (key: 'reminders' | 'dailySummary' | 'streakAlerts') => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* User profile header card */}
          <ThemedView type="backgroundElement" style={styles.profileCard}>
            <View style={styles.profileMainRow}>
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: settings.profile.avatar }} style={styles.profileAvatar as any} />
                <TouchableOpacity
                  style={styles.avatarEditBadge}
                  onPress={() => {
                    setTempName(settings.profile.name);
                    setTempAvatar(settings.profile.avatar);
                    setProfileModalVisible(true);
                  }}
                >
                  <SymbolView name="pencil" tintColor="#ffffff" size={10} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileMeta}>
                <View style={styles.nameHeaderRow}>
                  <ThemedText style={styles.profileName}>{settings.profile.name}</ThemedText>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setTempName(settings.profile.name);
                      setTempAvatar(settings.profile.avatar);
                      setProfileModalVisible(true);
                    }}
                  >
                    <SymbolView name="pencil.circle.fill" tintColor={theme.text} size={20} />
                  </TouchableOpacity>
                </View>
                <ThemedText themeColor="textSecondary" style={styles.memberSince}>
                  Member since {settings.profile.memberSince} • Keep the streak alive
                </ThemedText>
              </View>
            </View>

            {/* Quick Stats Grid inside card */}
            <View style={styles.quickStatsGrid}>
              <ThemedView type="backgroundSelected" style={styles.quickStatCol}>
                <ThemedText themeColor="textSecondary" style={styles.quickStatLabel}>
                  ACTIVE HABITS
                </ThemedText>
                <ThemedText style={styles.quickStatValue}>{activeHabitsCount}</ThemedText>
              </ThemedView>

              <ThemedView type="backgroundSelected" style={styles.quickStatCol}>
                <ThemedText themeColor="textSecondary" style={styles.quickStatLabel}>
                  OVERALL STREAK
                </ThemedText>
                <ThemedText style={styles.quickStatValue}>28 days</ThemedText>
              </ThemedView>
            </View>
          </ThemedView>

          {/* Section: Goals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SymbolView name="target" tintColor={theme.text} size={16} />
              <View style={{ marginLeft: Spacing.two }}>
                <ThemedText style={styles.sectionTitle}>Goals</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.sectionSubTitle}>
                  Track your daily and weekly targets
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTempDailyGoal(settings.dailyGoalTarget.toString());
                setTempWeeklyObj(settings.weeklyObjective.toString());
                setGoalsModalVisible(true);
              }}
              style={[
                styles.optionRow,
                { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }
              ]}
            >
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Daily goal target</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Complete {settings.dailyGoalTarget} habits per day
                </ThemedText>
              </View>
              <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={12} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTempDailyGoal(settings.dailyGoalTarget.toString());
                setTempWeeklyObj(settings.weeklyObjective.toString());
                setGoalsModalVisible(true);
              }}
              style={[
                styles.optionRow,
                { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }
              ]}
            >
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Weekly objective</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Hit {settings.weeklyObjective} completions this week
                </ThemedText>
              </View>
              <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={12} />
            </TouchableOpacity>
          </View>

          {/* Section: Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SymbolView name="bell" tintColor={theme.text} size={16} />
              <View style={{ marginLeft: Spacing.two }}>
                <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.sectionSubTitle}>
                  Choose how you want to stay on track
                </ThemedText>
              </View>
            </View>

            <View style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Reminders</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Habit reminders and nudges
                </ThemedText>
              </View>
              <Switch
                value={settings.notifications.reminders}
                onValueChange={() => handleToggleNotifications('reminders')}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
              />
            </View>

            <View style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Daily summary</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Morning overview of your plan
                </ThemedText>
              </View>
              <Switch
                value={settings.notifications.dailySummary}
                onValueChange={() => handleToggleNotifications('dailySummary')}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
              />
            </View>

            <View style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Streak alerts</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Warn before a streak breaks
                </ThemedText>
              </View>
              <Switch
                value={settings.notifications.streakAlerts}
                onValueChange={() => handleToggleNotifications('streakAlerts')}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
              />
            </View>
          </View>

          {/* Section: Preferences & Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SymbolView name="gearshape" tintColor={theme.text} size={16} />
              <View style={{ marginLeft: Spacing.two }}>
                <ThemedText style={styles.sectionTitle}>Preferences & Settings</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.sectionSubTitle}>
                  Customize the app experience
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleToggleTheme}
              style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}
            >
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Theme</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Active: {settings.theme === 'light' ? 'Light mode' : settings.theme === 'dark' ? 'Dark mode' : 'System default'}
                </ThemedText>
              </View>
              <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={12} />
            </TouchableOpacity>

            <View style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Units</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Metric (Celsius, kg, km)
                </ThemedText>
              </View>
              <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={12} />
            </View>

            <View style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Language</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  English
                </ThemedText>
              </View>
              <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={12} />
            </View>

            <View style={[styles.optionRow, { backgroundColor: scheme === 'dark' ? '#1c1d20' : '#f8f9fa' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionLabel}>Account</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  Profile and login details
                </ThemedText>
              </View>
              <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={12} />
            </View>

            <TouchableOpacity style={[styles.optionRow, styles.signOutRow, { backgroundColor: scheme === 'dark' ? 'rgba(239,68,68,0.06)' : '#fff5f5' }]}>
              <View style={styles.optionInfo}>
                <ThemedText style={[styles.optionLabel, { color: '#ef4444' }]}>Sign out</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.optionSubLabel}>
                  End your session on this device
                </ThemedText>
              </View>
              <SymbolView name="rectangle.portrait.and.arrow.right" tintColor="#ef4444" size={14} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="background" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Profile</ThemedText>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>User Name</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={tempName}
                  onChangeText={setTempName}
                />
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Avatar Image URL</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={tempAvatar}
                  onChangeText={setTempAvatar}
                  selectTextOnFocus
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <ThemedText style={styles.saveBtnText}>Save Details</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Edit Goals Modal */}
      <Modal
        visible={goalsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="background" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Targets</ThemedText>
              <TouchableOpacity onPress={() => setGoalsModalVisible(false)}>
                <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Daily Goal (habits/day)</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  keyboardType="number-pad"
                  value={tempDailyGoal}
                  onChangeText={setTempDailyGoal}
                />
              </View>

              <View style={styles.modalInputWrapper}>
                <ThemedText style={styles.modalInputLabel}>Weekly Objective (completions/week)</ThemedText>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  keyboardType="number-pad"
                  value={tempWeeklyObj}
                  onChangeText={setTempWeeklyObj}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoals}>
                <ThemedText style={styles.saveBtnText}>Save Targets</ThemedText>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  profileCard: {
    borderRadius: 28,
    padding: Spacing.four,
    marginBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  profileMeta: {
    marginLeft: Spacing.four,
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
  },
  editBtn: {
    padding: Spacing.half,
  },
  memberSince: {
    fontSize: 12,
    marginTop: Spacing.half,
    lineHeight: 16,
    fontWeight: '600',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  quickStatCol: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.half,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  section: {
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubTitle: {
    fontSize: 11,
    marginTop: Spacing.half,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 18,
    justifyContent: 'space-between',
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSubLabel: {
    fontSize: 11,
    marginTop: Spacing.half,
    fontWeight: '500',
  },
  signOutRow: {
    borderWidth: 1,
    borderColor: '#fee2e2',
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
    gap: Spacing.three,
  },
  modalInputWrapper: {
    gap: Spacing.one,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  modalTextInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0f172a',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
