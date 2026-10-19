import { ScrollView, Text, View } from 'react-native';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentProgress } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'Date pending';
}

export default function StudentProgress() {
  const { data, loading, error, refresh } = useMobileResource(getStudentProgress);
  const records = data?.records || [];
  const progress = Math.max(0, Math.min(100, Number(data?.overallProgress) || 0));

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Progress</Text>
      <Text className="mt-2 text-gray-500">Track completed lessons from your attendance records.</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />

      {data && <>
        <View className="mt-6 rounded-3xl bg-[#E6F1FB] p-5">
          <Text className="text-base font-semibold text-gray-600">Overall Lesson Progress</Text>
          <Text className="mt-2 text-4xl font-bold" style={{ color: ACCENT }}>{progress}%</Text>
          <View className="mt-4 h-3 overflow-hidden rounded-full bg-white">
            <View className="h-full" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
          </View>
          <Text className="mt-3 text-gray-600">{data.completedLessons || 0} completed of {data.totalLessons || 0} lessons</Text>
        </View>

        <Text className="mt-7 text-lg font-bold text-gray-800">Lesson History</Text>
        {records.length === 0 ? <Text className="mt-3 text-gray-500">No lesson progress records available.</Text> : records.map((record) => {
          const status = record.attendance?.status || 'NOT MARKED';
          const completed = ['PRESENT', 'LATE', 'COMPLETED', 'ATTENDED'].includes(String(status).toUpperCase());
          return <View key={record.id} className="mt-4 rounded-3xl border border-gray-200 p-5">
            <Text className="text-base font-bold text-gray-800">{record.lesson || 'Lesson'}</Text>
            <Text className="mt-1 text-sm text-gray-500">{formatDate(record.scheduledStart)} · {record.instructor?.name || 'Instructor pending'}</Text>
            <View className={`mt-4 self-start rounded-full px-3 py-1 ${completed ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-semibold ${completed ? 'text-green-800' : 'text-gray-700'}`}>{status.replaceAll('_', ' ')}</Text>
            </View>
            {record.attendance?.notes ? <Text className="mt-4 leading-6 text-gray-700">{record.attendance.notes}</Text> : null}
          </View>;
        })}
      </>}
    </ScrollView>
  );
}
