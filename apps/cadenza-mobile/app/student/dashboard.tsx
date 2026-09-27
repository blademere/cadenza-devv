import { ScrollView, Text, View } from "react-native";

const ACCENT = "#0C447C";
const ACCENT_SOFT = "#E6F1FB";

export default function StudentDashboard() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        Welcome back, Juan!
      </Text>

      <Text className="mt-2 text-gray-500">
        Here is your learning overview.
      </Text>

      {/* Enrollment Card */}
      <View
        className="mt-6 rounded-3xl p-5"
        style={{ backgroundColor: ACCENT_SOFT }}
      >
        <Text className="text-sm text-gray-600">Current Enrollment</Text>

        <Text className="mt-2 text-xl font-bold" style={{ color: ACCENT }}>
          Piano Lessons
        </Text>

        <Text className="mt-2 text-gray-600">Instructor: Terter</Text>

        <Text className="mt-1 text-gray-600">
          Schedule: Monday and Wednesday
        </Text>

        <View className="mt-4 self-start rounded-full bg-green-100 px-3 py-1">
          <Text className="text-sm font-semibold text-green-700">Active</Text>
        </View>
      </View>

      {/* Upcoming Class */}
      <View className="mt-5 rounded-3xl border border-gray-200 p-5">
        <Text className="text-lg font-bold text-gray-800">Upcoming Class</Text>

        <Text
          className="mt-3 text-base font-semibold"
          style={{ color: ACCENT }}
        >
          September 14, 2026
        </Text>

        <Text className="mt-1 text-gray-600">4:00 PM – 5:00 PM</Text>

        <Text className="mt-1 text-gray-600">Piano Lesson</Text>

        <Text className="mt-1 text-gray-600">Instructor: Terter</Text>

        <Text className="mt-1 text-gray-600">Room: Music Room 1</Text>
      </View>

      {/* Attendance Summary */}
      <View className="mt-5">
        <Text className="mb-3 text-lg font-bold text-gray-800">
          Attendance Summary
        </Text>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-green-50 p-4">
            <Text className="text-sm text-gray-600">Present</Text>
            <Text className="mt-2 text-2xl font-bold text-green-700">12</Text>
          </View>

          <View className="flex-1 rounded-2xl bg-red-50 p-4">
            <Text className="text-sm text-gray-600">Absent</Text>
            <Text className="mt-2 text-2xl font-bold text-red-700">1</Text>
          </View>

          <View className="flex-1 rounded-2xl bg-blue-50 p-4">
            <Text className="text-sm text-gray-600">Rate</Text>
            <Text className="mt-2 text-2xl font-bold" style={{ color: ACCENT }}>
              92%
            </Text>
          </View>
        </View>
      </View>

      {/* Learning Progress */}
      <View className="mt-6 rounded-3xl border border-gray-200 p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-800">
            Learning Progress
          </Text>

          <Text className="font-bold" style={{ color: ACCENT }}>
            75%
          </Text>
        </View>

        <View className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
          <View
            className="h-full rounded-full"
            style={{ width: "75%", backgroundColor: ACCENT }}
          />
        </View>

        <Text className="mt-3 text-gray-500">
          Keep practicing to improve your performance.
        </Text>
      </View>
    </ScrollView>
  );
}
