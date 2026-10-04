import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";

const ACCENT = "#0C447C";

type MaterialStatus = "Not Started" | "In Progress" | "Completed";

type Material = {
  id: string;
  title: string;
  description: string;
  type: string;
  instructor: string;
  uploadedDate: string;
  status: MaterialStatus;
  fileUrl: string;
};

const materials: Material[] = [
  {
    id: "1",
    title: "Introduction to Music",
    description: "Basic concepts and fundamentals of music.",
    type: "PDF Document",
    instructor: "Terter",
    uploadedDate: "September 1, 2026",
    status: "Not Started",
    fileUrl: "https://your-domain.com/uploads/introduction-to-music.pdf",
  },
  {
    id: "2",
    title: "Piano Finger Exercises",
    description: "Practice exercises for improving finger movement.",
    type: "PDF Document",
    instructor: "Terter",
    uploadedDate: "September 3, 2026",
    status: "In Progress",
    fileUrl: "https://your-domain.com/uploads/piano-finger-exercises.pdf",
  },
  {
    id: "3",
    title: "Basic Music Theory",
    description: "Learn the basic principles of music theory.",
    type: "PDF Document",
    instructor: "Terter",
    uploadedDate: "September 5, 2026",
    status: "Completed",
    fileUrl: "https://your-domain.com/uploads/basic-music-theory.pdf",
  },
];

function getStatusStyle(status: MaterialStatus) {
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

    case "Not Started":
    default:
      return {
        backgroundColor: "#E5E7EB",
        textColor: "#4B5563",
      };
  }
}

async function downloadMaterial(material: Material) {
  if (!material.fileUrl) {
    Alert.alert(
      "File Unavailable",
      "This material does not have an uploaded file.",
    );
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(material.fileUrl);

    if (!canOpen) {
      Alert.alert(
        "Unable to Open File",
        "This file cannot be opened on your device.",
      );
      return;
    }

    await Linking.openURL(material.fileUrl);
  } catch (error) {
    console.error("Download error:", error);

    Alert.alert(
      "Download Failed",
      "The material could not be opened. Please try again later.",
    );
  }
}

export default function StudentMaterials() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        Learning Materials
      </Text>

      <Text className="mt-2 text-gray-500">
        View and download materials uploaded by your instructor.
      </Text>

      <Text className="mt-6 text-lg font-bold text-gray-800">
        Uploaded Materials
      </Text>

      {materials.map((material) => {
        const statusStyle = getStatusStyle(material.status);

        return (
          <View
            key={material.id}
            className="mt-4 rounded-3xl border border-gray-200 p-5"
          >
            {/* Material Information */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/student/material-details",
                  params: {
                    materialId: material.id,
                  },
                })
              }
              className="active:opacity-70"
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
                  style={{
                    backgroundColor: statusStyle.backgroundColor,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: statusStyle.textColor,
                    }}
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

            {/* Download Button */}
            <Pressable
              onPress={() => downloadMaterial(material)}
              className="mt-4 items-center rounded-2xl p-4 active:opacity-80"
              style={{
                backgroundColor: ACCENT,
              }}
            >
              <Text className="font-bold text-white">Download Material</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
