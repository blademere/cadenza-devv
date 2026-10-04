import { ScrollView, Text, View } from "react-native";

const ACCENT = "#0C447C";

const schedules = [
  {
    id: "1",
    date: "September 14, 2026",
    time: "4:00 PM – 5:00 PM",
    lesson: "Piano Lesson",
    instructor: "Terter",
    room: "Music Room 1",
    status: "Scheduled",
  },
  {
    id: "2",
    date: "September 16, 2026",
    time: "4:00 PM – 5:00 PM",
    lesson: "Piano Lesson",
    instructor: "Terter",
    room: "Music Room 1",
    status: "Scheduled",
  },
  {
    id: "3",
    date: "September 18, 2026",
    time: "3:00 PM – 4:00 PM",
    lesson: "Practice Session",
    instructor: "Terter",
    room: "Practice Room 2",
    status: "Scheduled",
  },
];

export default function StudentSchedule() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        My Schedule
      </Text>

      <Text className="mt-2 text-gray-500">
        View your upcoming classes and lessons.
      </Text>

      <Text className="mt-6 text-lg font-bold text-gray-800">
        Upcoming Classes
      </Text>

      {schedules.map((schedule) => (
        <View
          key={schedule.id}
          className="mt-4 rounded-3xl border border-gray-200 p-5"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-base font-bold" style={{ color: ACCENT }}>
                {schedule.date}
              </Text>

              <Text className="mt-2 text-gray-600">{schedule.time}</Text>
            </View>

            <View className="rounded-full bg-green-100 px-3 py-1">
              <Text className="text-xs font-semibold text-green-700">
                {schedule.status}
              </Text>
            </View>
          </View>

          <View className="mt-4 border-t border-gray-100 pt-4">
            <Text className="text-lg font-bold text-gray-800">
              {schedule.lesson}
            </Text>

            <Text className="mt-2 text-gray-600">
              Instructor: {schedule.instructor}
            </Text>

            <Text className="mt-1 text-gray-600">Room: {schedule.room}</Text>
          </View>
        </View>
      ))}

      <Text className="mt-8 text-lg font-bold text-gray-800">
        Previous Classes
      </Text>

      <View className="mt-4 rounded-3xl border border-gray-200 p-5">
        <Text className="font-bold" style={{ color: ACCENT }}>
          September 9, 2026
        </Text>

        <Text className="mt-2 text-gray-700">Piano Lesson</Text>

        <Text className="mt-1 text-gray-500">Status: Completed</Text>
      </View>
    </ScrollView>
  );
}
