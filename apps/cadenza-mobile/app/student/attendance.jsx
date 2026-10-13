import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentAttendance } from '../../services/studentService';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

export default function StudentAttendance() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentAttendance);
  const records = data?.records || [];
  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Attendance</Text>
      <Text className="mt-2 text-gray-500">Review your class attendance records.</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {data && <>
        <View className="mt-6 rounded-3xl bg-[#E6F1FB] p-5">
          <Text className="text-sm text-gray-600">Attendance Summary</Text>
          <Text className="mt-1 text-3xl font-bold" style={{ color: ACCENT }}>{data.summary?.rate ?? 0}%</Text>
          <Text className="mt-2 text-gray-600">Present: {data.summary?.present ?? 0} · Late: {data.summary?.late ?? 0} · Absent: {data.summary?.absent ?? 0}</Text>
        </View>
        <Text className="mt-7 text-lg font-bold text-gray-800">Attendance History</Text>
        {records.length === 0 ? <Text className="mt-3 text-gray-500">No attendance records.</Text> : records.map((record) => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`View progress for ${record.lesson || 'Lesson'}`} onPress={() => router.push({ pathname: '/student/progress', params: { attendanceId: record.id, lesson: record.lesson || 'Lesson' } })} className="mt-4 rounded-3xl border border-gray-200 p-5">
          <Text className="font-bold" style={{ color: ACCENT }}>{record.scheduledStart ? new Date(record.scheduledStart).toLocaleDateString() : 'Date pending'}</Text>
          <Text className="mt-2 text-base font-semibold text-gray-800">{record.lesson || 'Lesson'}</Text>
          <Text className="mt-1 text-gray-500">Instructor: {record.instructor?.name || 'Pending'}</Text>
          <Text className="mt-2 text-sm font-semibold text-gray-700">{record.status}</Text>
          <Text className="mt-3 text-sm font-semibold" style={{ color: ACCENT }}>View lesson progress ›</Text>
        </Pressable>)}
      </>}
    </ScrollView>
  );
}
