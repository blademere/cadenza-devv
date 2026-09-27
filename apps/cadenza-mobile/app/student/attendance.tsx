import { ScrollView, Text, View } from "react-native";

const ACCENT = "#0C447C";

const attendanceRecords = [
  {
    id: "1",
    date: "September 9, 2026",
    lesson: "Piano Lesson",
    instructor: "Terter",
    status: "Present",
  },
  {
    id: "2",
    date: "September 7, 2026",
    lesson: "Piano Lesson",
    instructor: "Terter",
    status: "Present",
  },
  {
    id: "3",
    date: "September 4, 2026",
    lesson: "Piano Lesson",
    instructor: "Terter",
    status: "Late",
  },
  {
    id: "4",
    date: "September 2, 2026",
    lesson: "Piano Lesson",
    instructor: "Terter",
    status: "Absent",
  },
];

function getStatusStyle(status: string) {
  switch (status) {
    case "Present":
      return {
        backgroundColor: "#DCFCE7",
        textColor: "#15803D",
      };

    case "Late":
      return {
        backgroundColor: "#FEF3C7",
        textColor: "#B45309",
      };

    case "Absent":
      return {
        backgroundColor: "#FEE2E2",
        textColor: "#B91C1C",
      };

    default:
      return {
        backgroundColor: "#E5E7EB",
        textColor: "#374151",
      };
  }
}

export default function StudentAttendance() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        My Attendance
      </Text>

      <Text className="mt-2 text-gray-500">
        Review your class attendance records.
      </Text>

      {/* Summary */}
      <View className="mt-6">
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

          <View className="flex-1 rounded-2xl bg-yellow-50 p-4">
            <Text className="text-sm text-gray-600">Late</Text>
            <Text className="mt-2 text-2xl font-bold text-yellow-700">2</Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl bg-[#E6F1FB] p-5">
          <Text className="text-sm text-gray-600">Attendance Rate</Text>

          <Text className="mt-1 text-3xl font-bold" style={{ color: ACCENT }}>
            80%
          </Text>
        </View>
      </View>

      {/* History */}
      <Text className="mt-7 text-lg font-bold text-gray-800">
        Attendance History
      </Text>

      {attendanceRecords.map((record) => {
        const statusStyle = getStatusStyle(record.status);

        return (
          <View
            key={record.id}
            className="mt-4 rounded-3xl border border-gray-200 p-5"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="font-bold" style={{ color: ACCENT }}>
                  {record.date}
                </Text>

                <Text className="mt-2 text-base font-semibold text-gray-800">
                  {record.lesson}
                </Text>

                <Text className="mt-1 text-gray-500">
                  Instructor: {record.instructor}
                </Text>
              </View>

              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: statusStyle.backgroundColor }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: statusStyle.textColor }}
                >
                  {record.status}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
