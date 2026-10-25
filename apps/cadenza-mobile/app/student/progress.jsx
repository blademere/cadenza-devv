import { ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useMemo, useState } from 'react';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentProgress } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';
const COMPLETED = ['PRESENT', 'LATE', 'COMPLETED', 'ATTENDED'];
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Date pending';

export default function StudentProgress() {
  const { data, loading, error, refresh } = useMobileResource(getStudentProgress);
  const records = data?.records || [];
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const courses = useMemo(() => [...new Set(records.map((record) => record.courseName || record.lesson).filter(Boolean))].sort(), [records]);
  const filteredRecords = selectedCourse === 'ALL' ? records : records.filter((record) => (record.courseName || record.lesson) === selectedCourse);
  const completedLessons = filteredRecords.filter((record) => COMPLETED.includes(String(record.attendance?.status || '').toUpperCase())).length;
  const progress = selectedCourse === 'ALL' ? Math.max(0, Math.min(100, Number(data?.overallProgress) || 0)) : filteredRecords.length ? Math.round((completedLessons / filteredRecords.length) * 100) : 0;
  const courseName = selectedCourse === 'ALL' ? 'All courses' : selectedCourse || 'Your lessons';
  const counts = filteredRecords.reduce((result, record) => { const status = String(record.attendance?.status || 'NOT MARKED').toUpperCase(); const key = ['PRESENT', 'ATTENDED', 'COMPLETED'].includes(status) ? 'present' : status === 'LATE' ? 'late' : status === 'ABSENT' ? 'absent' : 'pending'; result[key] += 1; return result; }, { present: 0, late: 0, absent: 0, pending: 0 });

  return <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
    <View className="rounded-3xl bg-[#E6F1FB] p-5"><Text className="text-sm font-semibold uppercase tracking-widest text-[#4D6B84]">Learning report</Text><Text className="mt-2 text-3xl font-bold" style={{ color: ACCENT }}>My Progress</Text><Text className="mt-2 leading-5 text-[#557086]">See your completed lessons, attendance, and instructor feedback.</Text></View>
    <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
    {data && <>
      {courses.length > 1 && <View className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"><Picker selectedValue={selectedCourse} onValueChange={setSelectedCourse}><Picker.Item label="All courses" value="ALL" />{courses.map((course) => <Picker.Item key={course} label={course} value={course} />)}</Picker></View>}
      <View className="mt-5 rounded-3xl bg-[#0C447C] p-5"><Text className="text-sm font-semibold uppercase tracking-widest text-blue-100">{courseName}</Text><Text className="mt-3 text-base font-semibold text-blue-100">Overall lesson progress</Text><Text className="mt-2 text-5xl font-bold text-white">{progress}%</Text><View className="mt-4 h-3 overflow-hidden rounded-full bg-blue-300/40"><View className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></View><Text className="mt-3 text-blue-100">{completedLessons} of {filteredRecords.length} lessons completed</Text></View>
      <View className="mt-5 flex-row gap-3"><View className="flex-1 rounded-2xl bg-emerald-50 p-4"><Text className="text-2xl font-bold text-emerald-700">{counts.present}</Text><Text className="mt-1 text-xs font-semibold uppercase text-emerald-700">Present</Text></View><View className="flex-1 rounded-2xl bg-amber-50 p-4"><Text className="text-2xl font-bold text-amber-700">{counts.late}</Text><Text className="mt-1 text-xs font-semibold uppercase text-amber-700">Late</Text></View><View className="flex-1 rounded-2xl bg-slate-100 p-4"><Text className="text-2xl font-bold text-slate-700">{counts.pending}</Text><Text className="mt-1 text-xs font-semibold uppercase text-slate-700">Pending</Text></View></View>
      <Text className="mt-7 text-lg font-bold text-gray-900">Attendance &amp; Lesson History</Text>
      {filteredRecords.length === 0 ? <View className="mt-4 rounded-3xl border border-dashed border-gray-300 p-6"><Text className="text-center text-gray-500">No lesson progress records available.</Text></View> : filteredRecords.map((record) => { const status = String(record.attendance?.status || 'NOT MARKED').toUpperCase(); const completed = COMPLETED.includes(status); const color = completed ? 'bg-emerald-500' : status === 'LATE' ? 'bg-amber-500' : status === 'ABSENT' ? 'bg-red-500' : 'bg-slate-300'; return <View key={record.id} className="mt-3 flex-row rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><View className={`mr-3 mt-1 h-3 w-3 rounded-full ${color}`} /><View className="flex-1"><Text className="text-base font-bold text-gray-800">{record.lesson || 'Lesson'}</Text><Text className="mt-1 text-sm text-gray-500">{formatDate(record.scheduledStart)} · {record.instructor?.name || 'Instructor pending'}</Text><View className={`mt-3 self-start rounded-full px-3 py-1 ${completed ? 'bg-emerald-50' : status === 'LATE' ? 'bg-amber-50' : status === 'ABSENT' ? 'bg-red-50' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${completed ? 'text-emerald-700' : status === 'LATE' ? 'text-amber-700' : status === 'ABSENT' ? 'text-red-700' : 'text-slate-700'}`}>{status.replaceAll('_', ' ')}</Text></View>{record.attendance?.notes ? <Text className="mt-3 leading-6 text-gray-700">{record.attendance.notes}</Text> : null}</View></View>; })}
      {data.feedback?.filter((item) => selectedCourse === 'ALL' || item.lesson === selectedCourse).length > 0 && <><Text className="mt-7 text-lg font-bold text-gray-900">Instructor feedback</Text>{data.feedback.filter((item) => selectedCourse === 'ALL' || item.lesson === selectedCourse).map((item) => <View key={item.id} className="mt-3 rounded-2xl bg-[#F4F8FB] p-4"><Text className="leading-6 text-gray-700">“{item.message}”</Text><Text className="mt-3 text-sm text-gray-500">{item.instructor?.name || 'Instructor'} · {formatDate(item.createdAt)}</Text></View>)}</>}
    </>}
  </ScrollView>;
}
