import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentSchedule, requestStudentSchedule } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

export default function StudentSchedule() {
  const { data, loading, error, refresh } = useMobileResource(getStudentSchedule);
  const [selectedSession, setSelectedSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const enrollments = data?.enrollments ?? [];
  const schedules = data?.schedules ?? [];
  const enrollmentGroups = Object.values(enrollments.reduce((groups, enrollment) => {
    const key = enrollment.courseName || enrollment.id;
    groups[key] ||= { ...enrollment, enrollmentIds: [], packages: [] };
    groups[key].enrollmentIds.push(enrollment.id);
    if (enrollment.packageName && !groups[key].packages.includes(enrollment.packageName)) groups[key].packages.push(enrollment.packageName);
    return groups;
  }, {}));

  async function confirmRequest() {
    if (!selectedSession || submitting) return;
    setSubmitting(true);
    setRequestError('');
    try {
      await requestStudentSchedule(selectedSession.id);
      setSelectedSession(null);
      await refresh();
    } catch (requestErrorValue) {
      setRequestError(requestErrorValue?.response?.data?.message || requestErrorValue?.message || 'Unable to submit the schedule request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Schedule</Text>
        <Text className="mt-2 text-gray-500">Request a schedule for your approved enrollment.</Text>
        <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
        {!loading && !error && enrollments.length === 0 && <Text className="mt-6 text-gray-500">No approved enrollment available.</Text>}
        {enrollmentGroups.map((enrollment) => {
          const enrollmentSchedules = schedules.filter((schedule) => enrollment.enrollmentIds.includes(schedule.enrollmentId));
          return <View key={enrollment.courseName} className="mt-4 rounded-3xl bg-slate-50 p-4">
            <Text className="text-lg font-bold text-gray-800">{enrollment.courseName || 'Approved course'}</Text>
            {enrollment.packages.map((packageName) => <Text key={packageName} className="mt-1 text-gray-500">{packageName}</Text>)}
            <Text className="mt-2 text-sm font-semibold text-green-700">APPROVED</Text>
            <ScrollView
              className="mt-3 max-h-72 flex-grow-0 rounded-2xl"
              contentContainerStyle={{ paddingBottom: 4 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
            {enrollmentSchedules.map((lesson) => <View key={lesson.id} className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
              <Text className="font-bold" style={{ color: ACCENT }}>{lesson.scheduledStart ? new Date(lesson.scheduledStart).toLocaleString() : 'Time pending'}</Text>
              <Text className="mt-1 text-gray-600">Instructor: {lesson.instructor?.name || 'Pending'}</Text>
              <Text className="mt-1 text-gray-600">Room: {lesson.room?.name || 'Pending'}</Text>
              {lesson.scheduleRequest?.status === 'PENDING' ? <Text className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Schedule request pending Front Desk validation.</Text> : <Pressable onPress={() => { setRequestError(''); setSelectedSession(lesson); }} className="mt-4 rounded-xl bg-[#0C447C] px-4 py-3"><Text className="text-center font-semibold text-white">Request schedule</Text></Pressable>}
            </View>)}
            </ScrollView>
          </View>;
        })}
      </ScrollView>
      <Modal visible={Boolean(selectedSession)} transparent animationType="fade" onRequestClose={() => !submitting && setSelectedSession(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-3xl bg-white p-6">
            <Text className="text-xl font-bold text-gray-900">Request a schedule</Text>
            <Text className="mt-3 text-gray-600">Request a schedule for this specific lesson. The Front Desk must validate it before it changes.</Text>
            {requestError ? <Text className="mt-3 text-sm text-red-600">{requestError}</Text> : null}
            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable onPress={() => setSelectedSession(null)} disabled={submitting} className="rounded-xl px-4 py-3"><Text className="font-semibold text-gray-600">Cancel</Text></Pressable>
              <Pressable onPress={confirmRequest} disabled={submitting} className="rounded-xl bg-[#0C447C] px-4 py-3"><Text className="font-semibold text-white">{submitting ? 'Submitting...' : 'Confirm request'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
