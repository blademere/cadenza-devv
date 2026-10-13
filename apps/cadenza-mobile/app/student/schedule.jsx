import { ScrollView, Text, View } from 'react-native';
import RescheduleRequestButton from '../../components/common/RescheduleRequestButton';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentSchedule } from '../../services/studentService';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

export default function StudentSchedule() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentSchedule);
  const schedules = Array.isArray(data) ? data : [];
  const groupedSchedules = Object.values(schedules.reduce((groups, lesson) => {
    const key = lesson.scheduledStart ? new Date(lesson.scheduledStart).toLocaleDateString() : 'Time pending';
    if (!groups[key]) groups[key] = { date: key, lessons: [] };
    groups[key].lessons.push(lesson);
    return groups;
  }, {}));
  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Schedule</Text>
      <Text className="mt-2 text-gray-500">View your upcoming classes and lessons.</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {!loading && !error && schedules.length === 0 && <Text className="mt-6 text-gray-500">No classes scheduled.</Text>}
      {groupedSchedules.map((group) => <View key={group.date}>
        <Text className="mb-2 mt-5 font-bold text-gray-700">{group.date}</Text>
        {group.lessons.map((lesson) => <View key={lesson.id} className="mb-3 rounded-3xl border border-gray-200 p-5">
          <Text className="font-bold" style={{ color: ACCENT }}>{lesson.scheduledStart ? new Date(lesson.scheduledStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time pending'}</Text>
          <Text className="mt-2 text-lg font-bold text-gray-800">{lesson.lesson || 'Lesson'}</Text>
          <Text className="mt-2 text-gray-600">Instructor: {lesson.instructor?.name || 'Pending'}</Text>
          <Text className="mt-1 text-gray-600">Room: {lesson.room?.name || 'Pending'}</Text>
          <Text className="mt-2 text-sm text-gray-500">{lesson.status}</Text>
          <RescheduleRequestButton
            sessionId={lesson.id}
            lesson={lesson.lesson || 'Lesson'}
            scheduledStart={lesson.scheduledStart}
            requesterRole="CLIENT"
          />
        </View>)}
      </View>)}
    </ScrollView>
  );
}
