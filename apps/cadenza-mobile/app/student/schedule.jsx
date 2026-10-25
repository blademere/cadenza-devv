import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentSchedule, requestStudentSchedule } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';
const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date pending';
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time pending';

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
        <View className="rounded-3xl bg-[#E6F1FB] p-5">
          <Text className="text-sm font-semibold uppercase tracking-widest text-[#4D6B84]">Learning plan</Text>
          <Text className="mt-2 text-3xl font-bold" style={{ color: ACCENT }}>My Schedule</Text>
          <Text className="mt-2 leading-5 text-[#557086]">Keep track of your lessons and request a time when one is still pending.</Text>
        </View>
        <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
        <View className="mt-5 rounded-2xl bg-slate-100 px-4 py-3"><Text className="text-center text-sm font-bold text-[#0C447C]">Upcoming Schedule</Text></View>
        {!loading && !error && enrollments.length === 0 && <View className="mt-5 items-center rounded-3xl border border-dashed border-gray-300 px-6 py-10"><Text className="text-4xl">📅</Text><Text className="mt-3 text-lg font-bold text-gray-800">Nothing scheduled yet</Text><Text className="mt-2 text-center leading-5 text-gray-500">Your approved enrollment and lesson schedule will appear here.</Text></View>}
        {enrollmentGroups.map((enrollment) => {
          const enrollmentSchedules = schedules.filter((schedule) => enrollment.enrollmentIds.includes(schedule.enrollmentId));
          return <View key={enrollment.courseName} className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1"><Text className="text-xl font-bold text-gray-900">{enrollment.courseName || 'Approved course'}</Text>{enrollment.packages.map((packageName) => <Text key={packageName} className="mt-1 text-sm text-gray-500">{packageName}</Text>)}</View>
              <View className="rounded-full bg-emerald-50 px-3 py-1"><Text className="text-xs font-bold uppercase text-emerald-700">Approved</Text></View>
            </View>
            <ScrollView
              className="mt-3 max-h-72 flex-grow-0 rounded-2xl"
              contentContainerStyle={{ paddingBottom: 4 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
            {enrollmentSchedules.length === 0 && <Text className="mb-2 rounded-2xl bg-slate-50 p-4 text-sm text-gray-500">No lessons have been scheduled for this enrollment yet.</Text>}
            {enrollmentSchedules.map((lesson) => <View key={lesson.id} className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <View className="flex-row items-center"><View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#D7EAF8]"><Text className="text-lg">♪</Text></View><View className="flex-1"><Text className="font-bold" style={{ color: ACCENT }}>{formatDate(lesson.scheduledStart)}</Text><Text className="mt-1 text-sm text-gray-500">{formatTime(lesson.scheduledStart)}</Text></View></View>
              <View className="mt-4 border-t border-slate-200 pt-3"><Text className="text-sm text-gray-600">Instructor <Text className="font-semibold text-gray-800">{lesson.instructor?.name || 'Pending'}</Text></Text><Text className="mt-2 text-sm text-gray-600">Room <Text className="font-semibold text-gray-800">{lesson.room?.name || 'Pending'}</Text></Text>{lesson.rescheduled && <Text className="mt-2 text-sm font-semibold text-blue-700">New schedule: {formatDate(lesson.scheduledStart)} · {formatTime(lesson.scheduledStart)} - {formatTime(lesson.scheduledEnd)}</Text>}</View>
              {lesson.rescheduled ? <Text className="mt-4 self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Re-scheduled</Text> : lesson.scheduleRequest?.status === 'PENDING' ? <Text className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-5 text-amber-800">Schedule request pending Front Desk validation.</Text> : <Pressable onPress={() => { setRequestError(''); setSelectedSession(lesson); }} className="mt-4 rounded-xl bg-[#0C447C] px-4 py-3"><Text className="text-center font-semibold text-white">Request schedule</Text></Pressable>}
            </View>)}
            </ScrollView>
          </View>;
        })}
        {false && <View className="mt-5">
          <Text className="text-lg font-bold text-gray-900">Request a different time</Text>
          <Text className="mt-1 leading-5 text-gray-500">Choose a lesson below. Your request will be reviewed by the Front Desk.</Text>
          <View className="mt-5 items-center rounded-3xl border border-dashed border-gray-300 px-6 py-10">
            <Text className="text-4xl">🗓️</Text>
            <Text className="mt-3 text-lg font-bold text-gray-800">No re-schedule requests</Text>
            {schedules.filter((lesson) => lesson.scheduleRequest?.generatedOptions?.length).map((lesson) => <View key={lesson.id} className="mt-3 w-full rounded-2xl bg-slate-50 p-4"><Text className="font-bold text-gray-900">{lesson.courseName || lesson.lesson || 'Lesson'}</Text><Text className="mt-1 text-sm text-gray-500">Generated replacement schedules</Text>{lesson.scheduleRequest.generatedOptions.map((option) => <Text key={option.id} className="mt-2 text-sm font-semibold text-[#0C447C]">{option.date} · {option.time}</Text>)}</View>)}
            {!schedules.some((lesson) => lesson.scheduleRequest?.generatedOptions?.length) && <Text className="mt-2 text-center leading-5 text-gray-500">Available re-schedule options from the Front Desk will appear here.</Text>}
          </View>
        </View>}
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
