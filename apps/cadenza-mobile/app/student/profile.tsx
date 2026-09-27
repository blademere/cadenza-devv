import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

const ACCENT = "#0C447C";

export default function StudentProfile() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        My Profile
      </Text>

      {/* Profile Header */}
      <View className="mt-6 items-center rounded-3xl bg-[#E6F1FB] p-6">
        <View
          className="h-24 w-24 items-center justify-center rounded-full"
          style={{ backgroundColor: ACCENT }}
        >
          <Text className="text-3xl font-bold text-white">J</Text>
        </View>

        <Text className="mt-4 text-xl font-bold text-gray-800">
          Juan Dela Cruz
        </Text>

        <Text className="mt-1 text-gray-500">juan@example.com</Text>

        <View className="mt-3 rounded-full bg-green-100 px-3 py-1">
          <Text className="text-sm font-semibold text-green-700">
            Active Student
          </Text>
        </View>
      </View>

      {/* Personal Information */}
      <View className="mt-5 rounded-3xl border border-gray-200 p-5">
        <Text className="text-lg font-bold text-gray-800">
          Personal Information
        </Text>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Full Name</Text>

          <Text className="mt-1 text-base text-gray-800">Juan Dela Cruz</Text>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Email Address</Text>

          <Text className="mt-1 text-base text-gray-800">juan@example.com</Text>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Contact Number</Text>

          <Text className="mt-1 text-base text-gray-800">09123456789</Text>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Date of Birth</Text>

          <Text className="mt-1 text-base text-gray-800">January 15, 2010</Text>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Address</Text>

          <Text className="mt-1 text-base text-gray-800">
            Koronadal City, South Cotabato
          </Text>
        </View>
      </View>

      {/* Enrollment Information */}
      <View className="mt-5 rounded-3xl border border-gray-200 p-5">
        <Text className="text-lg font-bold text-gray-800">
          Enrollment Information
        </Text>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Enrolled Service</Text>

          <Text className="mt-1 text-base text-gray-800">Piano Lessons</Text>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Instructor</Text>

          <Text className="mt-1 text-base text-gray-800">Terter</Text>
        </View>

        <View className="mt-4">
          <Text className="text-sm text-gray-500">Student ID</Text>

          <Text className="mt-1 text-base text-gray-800">STU-0001</Text>
        </View>
      </View>

      {/* Actions */}
      <Pressable
        onPress={() => {}}
        className="mt-6 items-center rounded-2xl border border-[#0C447C] p-4"
      >
        <Text className="font-bold" style={{ color: ACCENT }}>
          Edit Profile
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/")}
        className="mt-3 items-center rounded-2xl bg-red-600 p-4"
      >
        <Text className="font-bold text-white">Logout</Text>
      </Pressable>
    </ScrollView>
  );
}
