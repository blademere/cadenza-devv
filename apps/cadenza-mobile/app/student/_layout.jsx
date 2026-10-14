import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { fonts } from '../../themes/fonts';
import { logout } from '../../services/authService';
import { getStudentNotifications } from '../../services/studentService';
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
function NotificationsModal({ visible, onClose, notifications, error }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/15" onPress={onClose}>
        <View
          onStartShouldSetResponder={() => true}
          className="absolute right-[15px] top-[60px] w-[260px] rounded-xl bg-white px-4 py-3"
          style={{
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          }}
        >
          <Text className="mb-2.5 text-base" style={{ fontFamily: fonts.bold }}>
            Notifications
          </Text>

          {notifications.length === 0 ? (
            <Text className="text-[#888]" style={{ fontFamily: fonts.regular }}>
              {error || 'No notifications'}
            </Text>
          ) : (
            notifications.map((item, index) => (
              <View
                key={index}
                className={`${index === 0 ? 'border-t-0' : 'border-t'} flex-row items-center border-[#f0f0f0] py-2`}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="#667EF9"
                  style={{ marginRight: 10 }}
                />

                <Text
                  className="flex-1 text-sm"
                  style={{ fontFamily: fonts.regular }}
                >
                  {item.message || item.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </Pressable>
    </Modal>
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
  const [visible, setVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  async function openNotifications() {
    setNotificationError('');
    try {
      const data = await getStudentNotifications();
      setNotifications(Array.isArray(data) ? [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) : []);
    } catch (error) {
      setNotificationError(error?.response?.data?.message || error?.message || 'Unable to load notifications.');
      setNotifications([]);
    }
    setVisible(true);
  }
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
          headerTitleStyle: {
            fontFamily: fonts.bold,
            fontSize: 16,
          },
          headerRight: () => (
            <View className="mr-[15px] flex-row items-center gap-4">
              <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={openNotifications} hitSlop={8}>
                <Ionicons name="notifications-outline" size={23} color="#000" />
              </Pressable>
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
          name="attendance"
          options={{
            title: 'Attendance',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'}
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
        <Tabs.Screen name="payments" options={{ href: null, title: 'Payments' }} />
      </Tabs>

      <NotificationsModal visible={visible} onClose={() => setVisible(false)} notifications={notifications} error={notificationError} />
      <ProfileMenu
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onProfile={() => router.push('/student/profile')}
        onLogout={handleLogout}
      />
    </>
  );
}
