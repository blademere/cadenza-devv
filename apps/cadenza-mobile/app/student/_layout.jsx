import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
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

export default function StudentLayout() {
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
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
    setLogoutDialogVisible(true);
  }
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleStyle: {
            fontFamily: fonts.bold,
            fontSize: 16,
          },
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
            shadowOffset: {
              width: 0,
              height: 4,
            },
          },
          tabBarItemStyle: {
            paddingTop: 6,
          },
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

        <Tabs.Screen
          name="materials"
          options={{
            title: 'Materials',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? 'document-text' : 'document-text-outline'}
                focused={focused}
              />
            ),
          }}
        />

        {/* Profile remains available as a route but is hidden from the tab bar. */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            href: null,
          }}
        />

        <Tabs.Screen
          name="material-details"
          options={{
            href: null,
          }}
        />
      </Tabs>

      <ProfileMenu
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onProfile={() => router.push('/student/profile')}
        onLogout={handleLogout}
      />
      <Modal visible={logoutDialogVisible} transparent animationType="fade" onRequestClose={() => !loggingOut && setLogoutDialogVisible(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-[360px] rounded-3xl bg-white p-6" style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16 }}>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50"><Text className="text-2xl">↪</Text></View>
            <Text className="mt-5 text-2xl font-bold text-gray-900">Log out?</Text>
            <Text className="mt-2 leading-6 text-gray-500">You will need to sign in again to view your lessons and progress.</Text>
            <View className="mt-7 flex-row justify-end gap-3">
              <Pressable disabled={loggingOut} onPress={() => setLogoutDialogVisible(false)} className="rounded-xl px-4 py-3"><Text className="font-semibold text-gray-600">Cancel</Text></Pressable>
              <Pressable disabled={loggingOut} onPress={() => { setLogoutDialogVisible(false); void completeLogout(); }} className="rounded-xl bg-[#E24B4A] px-5 py-3"><Text className="font-semibold text-white">{loggingOut ? 'Logging out...' : 'Log out'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
