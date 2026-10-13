import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';
import RescheduleRequestButton from '../../components/common/RescheduleRequestButton';
import useMobileResource from '../../hooks/useMobileResource';
import { getInstructorAttendance, markInstructorAttendance } from '../../services/instructor.service';

const ACCENT = '#0C447C';

function getLessonName(record) {
  return typeof record.lesson === 'string' ? record.lesson : record.lesson?.name || 'Lesson';
}

function getStudentName(record) {
  return record.studentName || record.student?.name || record.student || 'Student';
}

function getLessonTime(record) {
  const startsAt = record.scheduledStart || record.startsAt;
  return startsAt ? new Date(startsAt).toLocaleString() : 'Time pending';
}

function getProgressPercent(record) {
  const percentage = Number(record.progress);
  if (record.progress != null && Number.isFinite(percentage)) {
    return Math.max(0, Math.min(100, percentage));
  }
  const total = Number(record.totalLessons);
  if (total > 0) {
    return Math.max(0, Math.min(100, Math.round((Number(record.completedLessons || 0) / total) * 100)));
  }
  return ['PRESENT', 'LATE'].includes(String(record.status || '').toUpperCase()) ? 100 : 0;
}

export default function InstructorProgressPage() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getInstructorAttendance);
  const records = Array.isArray(data) ? data : data?.records || [];
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState('');

  async function saveLesson(record, status) {
    if (savingId) return;
    try {
      setSavingId(record.id);
      setSaveError('');
      const notes = feedbackDrafts[record.id] ?? record.notes ?? '';
      await markInstructorAttendance(record.id, status, notes.trim());
      await refresh();
    } catch (requestError) {
      setSaveError(requestError?.response?.data?.message || requestError?.message || 'Could not save attendance and feedback. Try again.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {isMock && <MockDataNotice />}
        <Text className="text-2xl font-bold text-[#0C447C]">Lesson Progress</Text>
        <Text className="mb-5 mt-2 text-gray-500">Record attendance and leave feedback for each lesson.</Text>
        {!!saveError && <Text accessibilityRole="alert" className="mb-4 text-sm text-red-700">{saveError}</Text>}
        <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
        {!loading && !error && records.length === 0 && <Text className="text-sm text-gray-500">No lessons available.</Text>}
        {records.map((record) => {
          const status = String(record.status || 'SCHEDULED').toUpperCase();
          const notes = feedbackDrafts[record.id] ?? record.notes ?? '';
          const saving = savingId === record.id;
          const progress = getProgressPercent(record);
          return (
            <View key={record.id} className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
              <Text className="text-base font-bold text-gray-900">{getLessonName(record)}</Text>
              <View className="mt-3 flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-sm text-gray-600">{getStudentName(record)}</Text>
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${getStudentName(record)} present`}
                    disabled={!!savingId}
                    onPress={() => saveLesson(record, 'PRESENT')}
                    className={`rounded-lg px-3 py-2 ${status === 'PRESENT' ? 'bg-green-200' : 'bg-green-100'}`}
                  >
                    <Text className="font-semibold text-green-800">{saving && status !== 'PRESENT' ? 'Saving…' : 'Present'}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${getStudentName(record)} absent`}
                    disabled={!!savingId}
                    onPress={() => saveLesson(record, 'ABSENT')}
                    className={`rounded-lg px-3 py-2 ${status === 'ABSENT' ? 'bg-red-200' : 'bg-red-100'}`}
                  >
                    <Text className="font-semibold text-red-800">{saving && status !== 'ABSENT' ? 'Saving…' : 'Absent'}</Text>
                  </Pressable>
                </View>
              </View>
              <Text className="mt-3 text-sm text-gray-500">{getLessonTime(record)}</Text>
              <Text className="mt-1 text-xs text-gray-500">Attendance: {status}</Text>
              <View className="mt-4 flex-row items-center justify-between">
                <Text className="font-semibold text-gray-700">Student progress</Text>
                <Text className="font-bold" style={{ color: ACCENT }}>{progress}%</Text>
              </View>
              <View className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
                <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
              </View>
              {record.totalLessons > 0 && <Text className="mt-2 text-xs text-gray-500">{record.completedLessons ?? 0} of {record.totalLessons} lessons attended</Text>}
              <RescheduleRequestButton
                sessionId={record.id}
                lesson={getLessonName(record)}
                scheduledStart={record.scheduledStart || record.startsAt}
                requesterRole="INSTRUCTOR"
              />
              <Text className="mb-2 mt-4 font-semibold text-gray-800">Instructor feedback</Text>
              <TextInput
                value={notes}
                onChangeText={(value) => setFeedbackDrafts((current) => ({ ...current, [record.id]: value }))}
                multiline
                textAlignVertical="top"
                accessibilityLabel={`Instructor feedback for ${getStudentName(record)}`}
                className="min-h-24 rounded-xl border border-gray-300 px-4 py-3 text-gray-900"
                placeholder="Add feedback for this lesson"
                editable={!saving}
              />
              {saving && <View className="mt-3 flex-row items-center"><ActivityIndicator size="small" color={ACCENT} /><Text className="ml-2 text-sm text-gray-500">Saving attendance and feedback…</Text></View>}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
