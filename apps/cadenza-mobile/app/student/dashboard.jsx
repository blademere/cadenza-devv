import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentDashboard } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Schedule pending';
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
const formatDay = (value) => value ? new Date(value).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Schedule pending';

export default function StudentDashboard() {
  const { data, loading, error, refresh } = useMobileResource(getStudentDashboard);
  const enrollmentGroups = Object.values((data?.enrollments || []).reduce((groups, enrollment) => {
    const key = enrollment.courseName || enrollment.id;
    groups[key] ||= { courseName: enrollment.courseName || 'Approved course', packages: [] };
    if (enrollment.packageName && !groups[key].packages.includes(enrollment.packageName)) groups[key].packages.push(enrollment.packageName);
    return groups;
  }, {}));
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const activeCourseName = enrollmentGroups.some((group) => group.courseName === selectedCourseName)
    ? selectedCourseName
    : enrollmentGroups[0]?.courseName || '';
  const selectedGroup = enrollmentGroups.find((group) => group.courseName === activeCourseName);
  const selectedEnrollment = data?.enrollments?.find((enrollment) => enrollment.courseName === activeCourseName);
  const upcomingClasses = (data?.upcomingClasses || []).filter((lesson) => lesson.courseName === activeCourseName).sort((first, second) => new Date(first.scheduledStart) - new Date(second.scheduledStart));
  const nextLesson = upcomingClasses.find((lesson) => !lesson.scheduledStart || new Date(lesson.scheduledStart) >= new Date()) || upcomingClasses[0];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
      <View className="rounded-3xl bg-[#E6F1FB] p-5"><Text className="text-sm font-semibold uppercase tracking-widest text-[#4D6B84]">Student home</Text><Text className="mt-2 text-3xl font-bold" style={{ color: ACCENT }}>Welcome back{data?.student?.firstName ? `, ${data.student.firstName}` : ''}!</Text><Text className="mt-2 leading-5 text-[#557086]">Here is your learning overview.</Text></View>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />

      {data && <>
        {nextLesson && <View className="mt-5 rounded-3xl bg-[#0C447C] p-5"><Text className="text-sm font-semibold uppercase tracking-widest text-blue-100">Next lesson</Text><Text className="mt-3 text-xl font-bold text-white">{formatDay(nextLesson.scheduledStart)}</Text><Text className="mt-1 text-base text-blue-100">{formatTime(nextLesson.scheduledStart)}{nextLesson.scheduledEnd ? ` – ${formatTime(nextLesson.scheduledEnd)}` : ''}</Text><View className="mt-4 border-t border-blue-300/40 pt-3"><Text className="font-semibold text-white">{nextLesson.lesson || activeCourseName || 'Lesson'}</Text><Text className="mt-1 text-sm text-blue-100">{nextLesson.instructor?.name || 'Instructor pending'} · {nextLesson.room?.name || 'Room pending'}</Text></View></View>}

        <View className="mt-5 rounded-3xl bg-[#F4F8FB] p-5">
          <Text className="text-sm text-gray-600">Current Enrollment</Text>
          {enrollmentGroups.length > 1 && <View className="mt-3 overflow-hidden rounded-xl border border-blue-200 bg-white">
            <Picker selectedValue={activeCourseName} onValueChange={setSelectedCourseName}>
              {enrollmentGroups.map((group) => <Picker.Item key={group.courseName} label={group.courseName} value={group.courseName} />)}
            </Picker>
          </View>}
          <Text className="mt-3 text-xl font-bold" style={{ color: ACCENT }}>{selectedGroup?.courseName || 'No active enrollment'}</Text>
          {selectedGroup?.packages.map((packageName) => <Text key={packageName} className="mt-1 text-gray-500">{packageName}</Text>)}
          {selectedEnrollment?.status && <View className="mt-4 self-start rounded-full bg-green-100 px-3 py-1"><Text className="text-sm font-semibold text-green-700">{selectedEnrollment.status}</Text></View>}
        </View>

        {upcomingClasses.length > 0 && <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-5"><View className="flex-row items-center justify-between"><Text className="text-lg font-bold text-gray-900">Weekly schedule</Text><Text className="text-sm text-gray-500">{upcomingClasses.length} lesson{upcomingClasses.length === 1 ? '' : 's'}</Text></View>{upcomingClasses.slice(0, 3).map((lesson) => <View key={lesson.id} className="mt-3 flex-row items-center rounded-2xl bg-slate-50 p-3"><View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#D7EAF8]"><Text className="text-lg">♪</Text></View><View className="flex-1"><Text className="font-semibold text-gray-800">{formatDay(lesson.scheduledStart)}</Text><Text className="mt-1 text-sm text-gray-500">{formatTime(lesson.scheduledStart)} · {lesson.instructor?.name || 'Instructor pending'}</Text></View></View>)}</View>}

        <View className="mt-5 rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-bold text-gray-800">Upcoming Classes</Text>
          <ScrollView className="mt-2 max-h-80" nestedScrollEnabled showsVerticalScrollIndicator>
            {upcomingClasses.length === 0 ? <Text className="mt-3 text-gray-500">No upcoming classes for this course.</Text> : upcomingClasses.map((lesson) => <View key={lesson.id} className="mt-3 rounded-2xl bg-slate-50 p-4">
              <Text className="font-semibold" style={{ color: ACCENT }}>{formatDate(lesson.scheduledStart)} · {formatTime(lesson.scheduledStart)}</Text>
              <Text className="mt-1 text-gray-700">{lesson.lesson}</Text>
              <Text className="mt-1 text-gray-500">{lesson.instructor?.name || 'Instructor pending'}{lesson.room?.name ? ` · ${lesson.room.name}` : ''}</Text>
            </View>)}
          </ScrollView>
        </View>
      </>}
    </ScrollView>
  );
}
