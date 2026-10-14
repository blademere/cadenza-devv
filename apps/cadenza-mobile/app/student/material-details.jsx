import { useCallback } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentMaterial } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

export default function StudentMaterialDetails() {
  const params = useLocalSearchParams();
  const materialId = Array.isArray(params.materialId) ? params.materialId[0] : params.materialId;
  const loadMaterial = useCallback(() => getStudentMaterial(materialId), [materialId]);
  const { data, loading, error, refresh } = useMobileResource(loadMaterial);

  async function openMaterial() {
    if (!data?.fileUrl) {
      Alert.alert('File unavailable', 'This sample material has no uploaded file.');
      return;
    }
    try {
      await Linking.openURL(data.fileUrl);
    } catch {
      Alert.alert('Unable to open file', 'Try again after the instructor adds a valid file link.');
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>Material Details</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {data && <View className="mt-6 rounded-3xl border border-gray-200 p-5">
        <Text className="text-xl font-bold text-gray-800">{data.title}</Text>
        <Text className="mt-3 leading-6 text-gray-600">{data.description}</Text>
        <Text className="mt-5 text-sm text-gray-600">Type: {data.type}</Text>
        <Text className="mt-1 text-sm text-gray-600">Instructor: {data.instructor?.name || 'Pending'}</Text>
        <Text className="mt-1 text-sm text-gray-600">Status: {data.status}</Text>
        <Text className="mt-1 text-sm text-gray-600">Uploaded: {data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString() : 'Pending'}</Text>
        <Pressable onPress={openMaterial} className="mt-6 items-center rounded-2xl p-4" style={{ backgroundColor: ACCENT }}>
          <Text className="font-bold text-white">Open Material</Text>
        </Pressable>
      </View>}
    </ScrollView>
  );
}
