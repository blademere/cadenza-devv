import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

const ACCENT = "#0C447C";

const materials = [
  {
    id: "1",
    title: "Introduction to Music",
    description: "Basic concepts and fundamentals of music.",
    type: "Reading Material",
    instructor: "Terter",
    uploadedDate: "September 1, 2026",
    status: "Not Started",
  },
  {
    id: "2",
    title: "Piano Finger Exercises",
    description: "Practice exercises for improving finger movement.",
    type: "Practice Guide",
    instructor: "Terter",
    uploadedDate: "September 3, 2026",
    status: "In Progress",
  },
  {
    id: "3",
    title: "Basic Music Theory",
    description: "Learn the basic principles of music theory.",
    type: "PDF Document",
    instructor: "Terter",
    uploadedDate: "September 5, 2026",
    status: "Completed",
  },
];

function getStatusStyle(status: string) {
  switch (status) {
    case "Completed":
      return {
        backgroundColor: "#DCFCE7",
        textColor: "#15803D",
      };

    case "In Progress":
      return {
        backgroundColor: "#FEF3C7",
        textColor: "#B45309",
      };

    default:
      return {
        backgroundColor: "#E5E7EB",
        textColor: "#4B5563",
      };
  }
}

export default function StudentMaterials() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        Learning Materials
      </Text>

      <Text className="mt-2 text-gray-500">
        Access your lessons and learning resources.
      </Text>

      <Text className="mt-6 text-lg font-bold text-gray-800">
        Assigned Materials
      </Text>

      {materials.map((material) => {
        const statusStyle = getStatusStyle(material.status);

        return (
          <Pressable
            key={material.id}
            onPress={() =>
              router.push({
                pathname: "/student/material-details",
                params: { materialId: material.id },
              })
            }
            className="mt-4 rounded-3xl border border-gray-200 p-5 active:opacity-70"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  {material.title}
                </Text>

                <Text className="mt-2 leading-5 text-gray-500">
                  {material.description}
                </Text>
              </View>

              <View
                className="ml-2 rounded-full px-3 py-1"
                style={{ backgroundColor: statusStyle.backgroundColor }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: statusStyle.textColor }}
                >
                  {material.status}
                </Text>
              </View>
            </View>

            <View className="mt-4 border-t border-gray-100 pt-4">
              <Text className="text-sm text-gray-600">
                Type: {material.type}
              </Text>

              <Text className="mt-1 text-sm text-gray-600">
                Instructor: {material.instructor}
              </Text>

              <Text className="mt-1 text-sm text-gray-600">
                Uploaded: {material.uploadedDate}
              </Text>
            </View>

            <Text className="mt-4 font-bold" style={{ color: ACCENT }}>
              View Material →
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
