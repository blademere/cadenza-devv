import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentDashboard } from '../../services/studentService';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Schedule pending';
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

export default function StudentDashboard() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentDashboard);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>
        Welcome back{data?.student?.firstName ? `, ${data.student.firstName}` : ''}!
      </Text>
      <Text className="mt-2 text-gray-500">Here is your learning overview.</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />

      {data && <>
        <View className="mt-6 rounded-3xl bg-[#E6F1FB] p-5">
          <Text className="text-sm text-gray-600">Current Enrollment</Text>
          <Text className="mt-2 text-xl font-bold" style={{ color: ACCENT }}>{data.enrollment?.courseName || 'No active enrollment'}</Text>
          {data.enrollment?.instructorName && <Text className="mt-2 text-gray-600">Instructor: {data.enrollment.instructorName}</Text>}
          {!!data.enrollment?.scheduleDays?.length && <Text className="mt-1 text-gray-600">Schedule: {data.enrollment.scheduleDays.join(' and ')}</Text>}
          {data.enrollment?.status && <View className="mt-4 self-start rounded-full bg-green-100 px-3 py-1"><Text className="text-sm font-semibold text-green-700">{data.enrollment.status}</Text></View>}
        </View>

        <View className="mt-5 rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-bold text-gray-800">Upcoming Classes</Text>
          {(data.upcomingClasses || []).length === 0 ? <Text className="mt-3 text-gray-500">No upcoming classes.</Text> : data.upcomingClasses.map((lesson) => <View key={lesson.id} className="mt-4 border-t border-gray-100 pt-3">
            <Text className="font-semibold" style={{ color: ACCENT }}>{formatDate(lesson.scheduledStart)} · {formatTime(lesson.scheduledStart)}</Text>
            <Text className="mt-1 text-gray-700">{lesson.lesson}</Text>
            <Text className="mt-1 text-gray-500">{lesson.instructor?.name || 'Instructor pending'}{lesson.room?.name ? ` · ${lesson.room.name}` : ''}</Text>
          </View>)}
        </View>

        <View className="mt-5 rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-bold text-gray-800">Attendance Summary</Text>
          <View className="mt-4 flex-row gap-3">
            <Summary label="Present" value={data.attendanceSummary?.present ?? 0} />
            <Summary label="Absent" value={data.attendanceSummary?.absent ?? 0} />
            <Summary label="Rate" value={`${data.attendanceSummary?.rate ?? 0}%`} />
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-gray-200 p-5">
          <View className="flex-row items-center justify-between"><Text className="text-lg font-bold text-gray-800">Learning Progress</Text><Text className="font-bold" style={{ color: ACCENT }}>{data.overallProgress ?? 0}%</Text></View>
          <View className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200"><View className="h-full" style={{ width: `${data.overallProgress ?? 0}%`, backgroundColor: ACCENT }} /></View>
        </View>

        <Pressable onPress={() => router.push('/student/payments')} className="mt-5 rounded-3xl border border-gray-200 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-800">Payments</Text>
            <Text className="font-semibold" style={{ color: ACCENT }}>View history ›</Text>
          </View>
          {data.paymentSummary ? <>
            <Text className="mt-3 text-sm text-gray-500">Outstanding balance</Text>
            <Text className="mt-1 text-2xl font-bold" style={{ color: ACCENT }}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: data.paymentSummary.currency || 'PHP' }).format(data.paymentSummary.outstandingAmount ?? 0)}</Text>
            <Text className="mt-2 text-sm text-gray-500">{data.paymentSummary.nextDueDate ? `Next due ${new Date(data.paymentSummary.nextDueDate).toLocaleDateString()}` : 'Payment details and history'}</Text>
          </> : <Text className="mt-3 text-sm text-gray-500">View your payment history and outstanding balance.</Text>}
        </Pressable>
      </>}
    </ScrollView>
  );
}

function Summary({ label, value }) {
  return <View className="flex-1 rounded-2xl bg-blue-50 p-3"><Text className="text-xs text-gray-600">{label}</Text><Text className="mt-2 text-xl font-bold" style={{ color: ACCENT }}>{value}</Text></View>;
}
