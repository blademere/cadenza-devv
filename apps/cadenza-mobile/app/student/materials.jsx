import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentMaterials } from '../../services/studentService';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';
const displayStatus = (value = '') => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function StudentMaterials() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentMaterials);
  const materials = Array.isArray(data) ? data : [];
  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>Learning Materials</Text>
      <Text className="mt-2 text-gray-500">Access your lessons and learning resources.</Text>
      <Text className="mt-6 text-lg font-bold text-gray-800">Assigned Materials</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {!loading && !error && materials.length === 0 && <Text className="mt-4 text-gray-500">No materials assigned.</Text>}
      {materials.map((material) => <Pressable key={material.id} onPress={() => router.push({ pathname: '/student/material-details', params: { materialId: material.id } })} className="mt-4 rounded-3xl border border-gray-200 p-5 active:opacity-70">
        <View className="flex-row items-start justify-between">
          <View className="flex-1"><Text className="text-lg font-bold text-gray-800">{material.title}</Text><Text className="mt-2 leading-5 text-gray-500">{material.description}</Text></View>
          <View className="ml-2 rounded-full bg-blue-50 px-3 py-1"><Text className="text-xs font-semibold text-blue-800">{displayStatus(material.status)}</Text></View>
        </View>
        <View className="mt-4 border-t border-gray-100 pt-4">
          <Text className="text-sm text-gray-600">Type: {displayStatus(material.type)}</Text>
          <Text className="mt-1 text-sm text-gray-600">Instructor: {material.instructor?.name || 'Pending'}</Text>
          <Text className="mt-1 text-sm text-gray-600">Uploaded: {material.uploadedAt ? new Date(material.uploadedAt).toLocaleDateString() : 'Date pending'}</Text>
        </View>
        <Text className="mt-4 font-bold" style={{ color: ACCENT }}>View Material →</Text>
      </Pressable>)}
    </ScrollView>
  );
}
