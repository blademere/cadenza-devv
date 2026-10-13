import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentAttendance, getStudentProgress } from '../../services/studentService';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

async function getStudentLessonProgress() {
  const [progress, attendance] = await Promise.all([
    getStudentProgress(),
    getStudentAttendance(),
  ]);
  return { progress, attendance };
}

function getLessonPercent(record) {
  if (Number.isFinite(Number(record.progress))) {
    return Math.max(0, Math.min(100, Number(record.progress)));
  }
  const status = String(record.status || '').toUpperCase();
  return ['PRESENT', 'LATE', 'COMPLETED', 'ATTENDED'].includes(status) ? 100 : 0;
}

export default function StudentProgress() {
  const params = useLocalSearchParams();
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentLessonProgress);
  const selectedId = Array.isArray(params.attendanceId) ? params.attendanceId[0] : params.attendanceId;
  const selectedLesson = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const allRecords = data?.attendance?.records || [];
  const records = selectedId ? allRecords.filter((record) => record.id === selectedId) : allRecords;
  const summary = data?.progress || {};
  const overallProgress = Number.isFinite(Number(summary.overallProgress))
    ? Math.max(0, Math.min(100, Number(summary.overallProgress)))
    : summary.totalLessons
      ? Math.round(((summary.completedLessons || 0) / summary.totalLessons) * 100)
      : 0;
  const feedback = (summary.feedback || []).filter((item) =>
    !selectedId || !item.attendanceId || item.attendanceId === selectedId,
  );

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>{selectedLesson || 'My Progress'}</Text>
      <Text className="mt-2 text-gray-500">Track lesson progress from your attendance history.</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {data && <>
        <View className="mt-6 rounded-3xl bg-[#E6F1FB] p-5">
          <Text className="text-base font-semibold text-gray-600">Overall Lesson Progress</Text>
          <Text className="mt-2 text-4xl font-bold" style={{ color: ACCENT }}>{overallProgress}%</Text>
          <View className="mt-4 h-3 overflow-hidden rounded-full bg-white"><View className="h-full" style={{ width: `${overallProgress}%`, backgroundColor: ACCENT }} /></View>
          <Text className="mt-3 text-gray-600">{summary.completedLessons ?? 0} completed of {summary.totalLessons ?? 0} lessons</Text>
        </View>

        <Text className="mt-7 text-lg font-bold text-gray-800">{selectedId ? 'Selected Lesson' : 'Lesson Progress'}</Text>
        {records.length === 0 ? <Text className="mt-3 text-gray-500">No matching lesson attendance record was found.</Text> : records.map((record) => {
          const percent = getLessonPercent(record);
          return <View key={record.id} className="mt-4 rounded-3xl border border-gray-200 p-5">
            <Text className="text-base font-bold text-gray-800">{record.lesson || selectedLesson || 'Lesson'}</Text>
            <Text className="mt-1 text-sm text-gray-500">{record.scheduledStart ? new Date(record.scheduledStart).toLocaleDateString() : 'Date pending'} · {record.status || 'Attendance pending'}</Text>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="font-semibold text-gray-600">Lesson progress</Text>
              <Text className="font-bold" style={{ color: ACCENT }}>{percent}%</Text>
            </View>
            <View className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200"><View className="h-full" style={{ width: `${percent}%`, backgroundColor: ACCENT }} /></View>
            {!!record.instructor?.name && <Text className="mt-3 text-sm text-gray-500">Instructor: {record.instructor.name}</Text>}
          </View>;
        })}

        {feedback.length > 0 && <>
          <Text className="mt-7 text-lg font-bold text-gray-800">Instructor Feedback</Text>
          {feedback.map((item) => <View key={item.id} className="mt-4 rounded-3xl border border-gray-200 p-5">
            <Text className="leading-6 text-gray-700">{item.message}</Text>
            <Text className="mt-4 text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}{item.instructor?.name ? ` · ${item.instructor.name}` : ''}</Text>
          </View>)}
        </>}
        {feedback.length === 0 && <Text className="mt-6 text-gray-500">No instructor feedback for this lesson yet.</Text>}
      </>}
    </ScrollView>
  );
}
