import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import ReadablePicker from '../../components/ui/ReadablePicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';
import RescheduleRequestButton from '../../components/common/RescheduleRequestButton';
import { getInstructorSchedule } from '../../services/instructor.service';

const ACCENT = '#0C447C';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Date pending';
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time pending';
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState('ALL');

  async function loadSchedule() {
    try {
      setError(null);
      const data = await getInstructorSchedule();
      setSchedules(data?.schedules ?? []);
      setAvailableCourses(data?.courses ?? []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load schedule.');
      setSchedules([]);
      setAvailableCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void loadSchedule(); }, []);

  async function refreshSchedule() {
    setRefreshing(true);
    await loadSchedule();
  }

  const courses = availableCourses;
  const students = useMemo(() => [...new Map(
    schedules
      .map((item) => [item.studentId || item.studentName || item.student, { id: item.studentId || item.studentName || item.student, name: item.studentName || item.student || 'Student' }])
      .filter(([id]) => id),
  ).values()].sort((first, second) => first.name.localeCompare(second.name)), [schedules]);
  const filteredSchedules = useMemo(
    () => schedules.filter((item) => {
      const matchesCourse = selectedCourse === 'ALL' || (item.courseId || item.courseName || item.lesson) === selectedCourse;
      const matchesStudent = selectedStudent === 'ALL' || (item.studentId || item.studentName || item.student) === selectedStudent;
      return matchesCourse && matchesStudent;
    }),
    [schedules, selectedCourse, selectedStudent],
  );

  const groupedSchedules = useMemo(() => {
    const groups = new Map();
    filteredSchedules.forEach((item) => {
      const dateKey = item.scheduledStart ? new Date(item.scheduledStart).toISOString().slice(0, 10) : 'unscheduled';
      const slotKey = `${dateKey}|${item.scheduledStart || 'pending'}|${item.scheduledEnd || 'pending'}|${item.lesson || 'Lesson'}`;
      if (!groups.has(dateKey)) groups.set(dateKey, new Map());
      const dayGroups = groups.get(dateKey);
      if (!dayGroups.has(slotKey)) dayGroups.set(slotKey, { ...item, students: [] });
      const slot = dayGroups.get(slotKey);
      const studentName = item.studentName || item.student || 'Student';
      if (!slot.students.includes(studentName)) slot.students.push(studentName);
      if (item.rescheduled) slot.rescheduled = true;
      if (item.scheduleRequest) {
        slot.scheduleRequest = item.scheduleRequest;
        slot.hasSavedRequest = true;
      }
    });
    return [...groups.entries()]
      .map(([dateKey, dayGroups]) => [dateKey, [...dayGroups.values()].sort((a, b) => new Date(a.scheduledStart || 0) - new Date(b.scheduledStart || 0))])
      .sort(([first], [second]) => first.localeCompare(second));
  }, [filteredSchedules]);

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshSchedule} />}
      >
        <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Schedule</Text>
        <Text className="mt-2 text-gray-500">Lessons assigned to you from the database.</Text>
        {courses.length > 0 && <View className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white"><ReadablePicker selectedValue={selectedCourse} onValueChange={setSelectedCourse}><ReadablePicker.Item label="All courses" value="ALL" />{courses.map((course) => <ReadablePicker.Item key={course.id} label={course.name} value={course.id} />)}</ReadablePicker></View>}
        {students.length > 0 && <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white"><ReadablePicker selectedValue={selectedStudent} onValueChange={setSelectedStudent}><ReadablePicker.Item label="All students" value="ALL" />{students.map((student) => <ReadablePicker.Item key={student.id} label={student.name} value={student.id} />)}</ReadablePicker></View>}
        <ResourceFeedback loading={loading} error={error} onRetry={loadSchedule} />
        {loading && <ActivityIndicator className="mt-6" size="small" color={ACCENT} />}
        {!loading && !error && filteredSchedules.length === 0 && <Text className="mt-6 text-sm text-gray-500">No lessons scheduled for this course.</Text>}
        {groupedSchedules.map(([dateKey, daySchedules]) => (
          <View key={dateKey} className="mt-5">
            <Text className="mb-2 text-lg font-bold text-gray-900">{dateKey === 'unscheduled' ? 'Date pending' : formatDate(daySchedules[0].scheduledStart)}</Text>
            {daySchedules.map((item) => (
              <View key={item.id} className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold" style={{ color: ACCENT }}>{item.lesson || 'Lesson'}</Text>
                    <Text className="mt-1 font-semibold text-gray-900">{formatTime(item.scheduledStart)} - {formatTime(item.scheduledEnd)}</Text>
                    {item.rescheduled && <Text className="mt-1 text-sm font-semibold text-blue-700">New schedule: {formatDate(item.scheduledStart)} · {formatTime(item.scheduledStart)} - {formatTime(item.scheduledEnd)}</Text>}
                  </View>
                  <Text className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-800">{item.attendance?.status || item.status || 'Scheduled'}</Text>
                </View>
                <Text className="mt-3 text-sm font-semibold text-gray-700">Students ({item.students.length})</Text>
                <View className="mt-1">
                  {item.students.map((studentName) => <Text key={studentName} className="mb-1 text-sm text-gray-600">• {studentName}</Text>)}
                </View>
                {item.room?.name && <Text className="mt-2 text-sm text-gray-600">Room: {item.room.name}</Text>}
                {item.rescheduled ? <Text className="mt-4 self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Re-scheduled</Text> : item.hasSavedRequest ? <Text className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Reschedule request saved: {item.scheduleRequest?.status || 'SUBMITTED'}. Front Desk will review it.</Text> : <RescheduleRequestButton sessionId={item.id} lesson={item.lesson || 'Lesson'} scheduledStart={item.scheduledStart} />}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
