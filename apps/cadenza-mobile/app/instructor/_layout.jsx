import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { fonts } from '../../themes/fonts';
import { logout } from '../../services/authService';
const ACCENT = '#0C447C';
const ACCENT_SOFT = '#E6F1FB';
const MUTED = '#888780';
function TabIcon({ name, focused }) {
  return (
    <View
      className="items-center justify-center rounded-xl"
      style={{
        width: 40,
        height: 32,
        backgroundColor: focused ? ACCENT_SOFT : 'transparent',
      }}
    >
      <Ionicons name={name} size={20} color={focused ? ACCENT : MUTED} />
    </View>
  );
}
function ProfileMenu({ visible, onClose, onProfile, onLogout }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/15" onPress={onClose}>
        <View
          onStartShouldSetResponder={() => true}
          className="absolute right-[15px] top-[60px] w-[190px] rounded-xl bg-white p-2"
          style={{ elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My Profile"
            onPress={() => {
              onClose();
              onProfile();
            }}
            className="flex-row items-center rounded-lg px-3 py-3"
          >
            <Ionicons name="person-outline" size={20} color={ACCENT} />
            <Text className="ml-3 text-base" style={{ fontFamily: fonts.regular }}>
              My Profile
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => {
              onClose();
              onLogout();
            }}
            className="flex-row items-center rounded-lg px-3 py-3"
          >
            <Ionicons name="log-out-outline" size={20} color="#e24b4a" />
            <Text className="ml-3 text-base text-[#e24b4a]" style={{ fontFamily: fonts.regular }}>
              Logout
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function InstructorLayout() {
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  async function completeLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.warn('Unable to clear the saved session.', error);
    } finally {
      setLoggingOut(false);
      router.replace('/login');
    }
  }

  function handleLogout() {
    if (loggingOut) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to log out of the mobile application?')) {
        void completeLogout();
      }
      return;
    }

    Alert.alert(
      'Log out',
      'Are you sure you want to log out of the mobile application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => void completeLogout(),
        },
      ],
    );
  }
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
          headerRight: () => (
            <View className="mr-[15px] flex-row items-center gap-4">
              <Pressable accessibilityRole="button" accessibilityLabel="Profile menu" onPress={() => setProfileMenuVisible(true)} hitSlop={8}>
                {loggingOut ? <ActivityIndicator size="small" color="#e24b4a" /> : <Ionicons name="person-circle-outline" size={25} color={ACCENT} />}
              </Pressable>
            </View>
          ),
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: MUTED,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontFamily: fonts.regular,
            fontSize: 11,
            marginTop: 2,
          },
          tabBarStyle: {
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: Platform.OS === 'ios' ? 24 : 16,
            height: 64,
            borderRadius: 20,
            backgroundColor: '#fff',
            borderTopWidth: 0,
            elevation: 4,
            shadowColor: ACCENT,
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          },
          tabBarItemStyle: { paddingTop: 6 },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? 'grid' : 'grid-outline'}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? 'calendar' : 'calendar-outline'}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? 'bar-chart' : 'bar-chart-outline'}
                focused={focused}
              />
            ),
          }}
        />

        {/*
          profile still lives in this route group so router.push('/instructor/profile')
          keeps working, but it's hidden from the tab bar to avoid a 6th cramped tab.
          Its title and avatar previously lived in the drawer header — worth surfacing
          a small avatar button in the Tabs headerLeft on that one screen if you want
          quick profile access without the logout icon there.
        */}
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>

      <ProfileMenu
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onProfile={() => router.push('/instructor/profile')}
        onLogout={handleLogout}
      />
    </>
  );
}
