import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { fonts } from "../../themes/fonts";

type IconName = keyof typeof Ionicons.glyphMap;

const ACCENT = "#0C447C";
const ACCENT_SOFT = "#E6F1FB";
const MUTED = "#888780";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View
      className="items-center justify-center rounded-xl"
      style={{
        width: 40,
        height: 32,
        backgroundColor: focused ? ACCENT_SOFT : "transparent",
      }}
    >
      <Ionicons name={name} size={20} color={focused ? ACCENT : MUTED} />
    </View>
  );
}

const notifications = [
  { text: "Nagmahal" },
  { text: "Nasaktan" },
  { text: "Naghiking" },
];

function NotificationsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/15" onPress={onClose}>
        <View
          onStartShouldSetResponder={() => true}
          className="absolute right-[15px] top-[60px] w-[260px] rounded-xl bg-white px-4 py-3"
          style={{
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          }}
        >
          <Text className="mb-2.5 text-base" style={{ fontFamily: fonts.bold }}>
            Notifications
          </Text>

          {notifications.length === 0 ? (
            <Text className="text-[#888]" style={{ fontFamily: fonts.regular }}>
              No notifications
            </Text>
          ) : (
            notifications.map((item, index) => (
              <View
                key={index}
                className={`${index === 0 ? "border-t-0" : "border-t"} flex-row items-center border-[#f0f0f0] py-2`}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="#667ef9"
                  style={{ marginRight: 10 }}
                />

                <Text className="flex-1 text-sm" style={{ fontFamily: fonts.regular }}>
                  {item.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function InstructorLayout() {
  const [visible, setVisible] = useState(false);


  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
          /*
          headerLeft: () => (
            <Pressable onPress={handleLogout} className="ml-[15px]">
              <Ionicons name="log-out-outline" size={22} color="#e24b4a" />
            </Pressable>
          ),*/
          headerRight: () => (
            <Pressable onPress={() => setVisible(true)} className="mr-[15px]">
              <Ionicons name="notifications-outline" size={24} color="#000" />
            </Pressable>
          ),
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: MUTED,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
          tabBarStyle: {
            position: "absolute",
            left: 16,
            right: 16,
            bottom: Platform.OS === "ios" ? 24 : 16,
            height: 64,
            borderRadius: 20,
            backgroundColor: "#fff",
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
            title: "Dashboard",
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? "grid" : "grid-outline"} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? "calendar" : "calendar-outline"} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? "checkmark-circle" : "checkmark-circle-outline"}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? "bar-chart" : "bar-chart-outline"} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="availability"
          options={{
            title: "Availability",
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? "time" : "time-outline"} focused={focused} />
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

      <NotificationsModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}