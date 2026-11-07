import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { fonts } from '../../themes/fonts';
import { logout } from '../../services/authService';
import { getStudentNotifications, markStudentNotificationRead } from '../../services/studentService';
import { getInstructorSchedule } from '../../services/instructor.service';
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
function RescheduleTabIcon({ focused, count }) {
  return <View className="relative"><TabIcon name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} focused={focused} />{count > 0 ? <View className="absolute -right-2 -top-2 min-w-5 items-center rounded-full bg-red-500 px-1"><Text className="text-[10px] font-bold leading-4 text-white">{count > 99 ? '99+' : count}</Text></View> : null}</View>;
}
function ProfileMenu({ visible, onClose, onProfile, onLogout, onNotifications, unreadNotificationCount }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/15" onPress={onClose}>
        <View
          onStartShouldSetResponder={() => true}
          className="absolute right-[15px] top-[60px] w-[190px] rounded-xl bg-white p-2"
          style={{ elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}
        >
          <Pressable onPress={() => { onClose(); onNotifications(); }} className="flex-row items-center rounded-lg px-3 py-3"><View className="relative"><Ionicons name="notifications-outline" size={20} color={ACCENT} />{unreadNotificationCount > 0 ? <View className="absolute -right-3 -top-2 min-w-4 items-center rounded-full bg-red-500 px-1"><Text className="text-[10px] font-bold leading-4 text-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text></View> : null}</View><Text className="ml-3 text-base" style={{ fontFamily: fonts.regular }}>Notifications</Text></Pressable>
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
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pendingRescheduleCount, setPendingRescheduleCount] = useState(0);
  const unreadNotificationCount = notifications.filter((item) => !item.readAt).length;
  async function loadNotifications() { try { const result = await getStudentNotifications(); setNotifications(Array.isArray(result) ? result : []); } catch (error) { console.warn('Unable to load notifications.', error); } }
  async function loadPendingReschedules() { try { const result = await getInstructorSchedule(); const schedules = result?.schedules || []; setPendingRescheduleCount(schedules.filter((item) => item.rescheduled !== true && item.scheduleRequest?.status === 'PENDING' && item.scheduleRequest?.studentChoice).length); } catch (error) { console.warn('Unable to load pending reschedules.', error); } }
  useEffect(() => { void loadNotifications(); void loadPendingReschedules(); const timer = setInterval(() => { void loadNotifications(); void loadPendingReschedules(); }, 30000); return () => clearInterval(timer); }, []);
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

  async function markInstructorNotificationRead(item) {
    if (!item?.id || item.readAt) return;
    try {
      await markStudentNotificationRead(item.id);
      setNotifications((current) => current.map((notification) => (
        notification.id === item.id
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      )));
    } catch (error) {
      console.warn('Unable to mark notification as read.', error);
    }
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
                {loggingOut ? <ActivityIndicator size="small" color="#e24b4a" /> : <View className="relative"><Ionicons name="person-circle-outline" size={25} color={ACCENT} />{unreadNotificationCount > 0 ? <View className="absolute -right-3 -top-2 min-w-4 items-center rounded-full bg-red-500 px-1"><Text className="text-[10px] font-bold leading-4 text-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text></View> : null}</View>}
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
          name="reschedule"
          options={{
            title: 'Reschedule',
            tabBarIcon: ({ focused }) => <RescheduleTabIcon focused={focused} count={pendingRescheduleCount} />,
          }}
        />

        <Tabs.Screen
          name="students"
          options={{
            title: 'Students',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? 'people' : 'people-outline'}
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
          name="material-details"
          options={{ href: null }}
        />

        <Tabs.Screen name="Profile" options={{ href: null }} />
      </Tabs>

      <Modal visible={notificationsVisible} transparent animationType="fade" onRequestClose={() => setNotificationsVisible(false)}><View className="flex-1 bg-black/20"><View className="absolute left-5 right-5 top-[60px] max-h-[70%] rounded-2xl bg-white p-4" style={{ elevation: 6 }}><View className="flex-row items-center justify-between"><Text className="text-lg font-bold text-gray-900">Notifications</Text><Pressable onPress={() => setNotificationsVisible(false)}><Text className="text-sm font-semibold text-[#0C447C]">Close</Text></Pressable></View><ScrollView className="mt-3">{!notifications.length ? <Text className="py-6 text-center text-sm text-gray-500">No notifications yet.</Text> : notifications.map((item) => <Pressable key={item.id} onPress={async () => { await markInstructorNotificationRead(item); setNotificationsVisible(false); if (item.data?.route) router.push(item.data.route); }} className={`mb-2 rounded-xl p-3 ${item.readAt ? 'bg-gray-50' : 'bg-blue-50'}`}><Text className="font-semibold text-gray-900">{item.title || 'Cadenza update'}</Text><Text className="mt-1 text-sm leading-5 text-gray-600">{item.message}</Text>{!item.readAt ? <Pressable onStartShouldSetResponder={() => true} onPress={() => { void markInstructorNotificationRead(item); }} className="mt-3 self-start rounded-lg bg-[#0C447C] px-3 py-2"><Text className="text-xs font-semibold text-white">Mark as read</Text></Pressable> : null}</Pressable>)}</ScrollView></View></View></Modal>

      <ProfileMenu
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onProfile={() => router.push('/instructor/profile')}
        onLogout={handleLogout}
        onNotifications={() => { setNotificationsVisible(true); void loadNotifications(); }}
        unreadNotificationCount={unreadNotificationCount}
      />
      <Modal visible={logoutDialogVisible} transparent animationType="fade" onRequestClose={() => !loggingOut && setLogoutDialogVisible(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-[360px] rounded-3xl bg-white p-6" style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16 }}>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50"><Text className="text-2xl">↪</Text></View>
            <Text className="mt-5 text-2xl font-bold text-gray-900">Log out?</Text>
            <Text className="mt-2 leading-6 text-gray-500">You will need to sign in again to view your students and schedule.</Text>
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
