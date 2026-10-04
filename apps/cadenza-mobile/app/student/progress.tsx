import { ScrollView, Text, View } from "react-native";

const ACCENT = "#0C447C";

const skills = [
  {
    id: "1",
    name: "Reading Musical Notes",
    progress: 90,
  },
  {
    id: "2",
    name: "Basic Chords",
    progress: 75,
  },
  {
    id: "3",
    name: "Finger Exercises",
    progress: 80,
  },
  {
    id: "4",
    name: "Rhythm and Timing",
    progress: 60,
  },
];

export default function StudentProgress() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        My Progress
      </Text>

      <Text className="mt-2 text-gray-500">
        Track your learning development and performance.
      </Text>

      {/* Overall Progress */}
      <View className="mt-6 rounded-3xl bg-[#E6F1FB] p-5">
        <Text className="text-base font-semibold text-gray-600">
          Overall Progress
        </Text>

        <Text className="mt-2 text-4xl font-bold" style={{ color: ACCENT }}>
          75%
        </Text>

        <View className="mt-4 h-3 overflow-hidden rounded-full bg-white">
          <View
            className="h-full rounded-full"
            style={{ width: "75%", backgroundColor: ACCENT }}
          />
        </View>

        <Text className="mt-3 text-gray-600">
          You are making good progress. Keep practicing!
        </Text>
      </View>

      {/* Lesson Summary */}
      <View className="mt-5 rounded-3xl border border-gray-200 p-5">
        <Text className="text-lg font-bold text-gray-800">Lesson Progress</Text>

        <View className="mt-4 flex-row justify-between">
          <View>
            <Text className="text-sm text-gray-500">Completed Lessons</Text>

            <Text className="mt-1 text-2xl font-bold" style={{ color: ACCENT }}>
              9
            </Text>
          </View>

          <View>
            <Text className="text-sm text-gray-500">Total Lessons</Text>

            <Text className="mt-1 text-2xl font-bold" style={{ color: ACCENT }}>
              12
            </Text>
          </View>
        </View>
      </View>

      {/* Skills */}
      <Text className="mt-7 text-lg font-bold text-gray-800">
        Skills Development
      </Text>

      {skills.map((skill) => (
        <View
          key={skill.id}
          className="mt-4 rounded-3xl border border-gray-200 p-5"
        >
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-base font-semibold text-gray-800">
              {skill.name}
            </Text>

            <Text className="font-bold" style={{ color: ACCENT }}>
              {skill.progress}%
            </Text>
          </View>

          <View className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200">
            <View
              className="h-full rounded-full"
              style={{
                width: `${skill.progress}%`,
                backgroundColor: ACCENT,
              }}
            />
          </View>

          <Text className="mt-2 text-sm text-gray-500">In Progress</Text>
        </View>
      ))}

      {/* Instructor Feedback */}
      <View className="mt-6 rounded-3xl bg-gray-50 p-5">
        <Text className="text-lg font-bold text-gray-800">
          Instructor Feedback
        </Text>

        <Text className="mt-3 leading-6 text-gray-600">
          You are improving consistently. Continue practicing your finger
          exercises and rhythm exercises.
        </Text>

        <Text className="mt-4 text-sm text-gray-500">
          Last Evaluation: September 9, 2026
        </Text>

        <Text className="mt-1 text-sm text-gray-500">Evaluated by: Terter</Text>
      </View>
    </ScrollView>
  );
}
