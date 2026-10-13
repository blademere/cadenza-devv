import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttendanceCard from '../../components/instructor/AttendanceCard';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';
import useMobileResource from '../../hooks/useMobileResource';
import { getInstructorAttendance, markInstructorAttendance } from '../../services/instructor.service';

export default function InstructorAttendancePage() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getInstructorAttendance);
  const [savingId, setSavingId] = useState(null);
  const records = Array.isArray(data) ? data : [];

  async function markAttendance(sessionId, status) {
    if (savingId) return;
    try {
      setSavingId(sessionId);
      await markInstructorAttendance(sessionId, status);
      await refresh();
    } catch (requestError) {
      Alert.alert('Could not save attendance', requestError?.response?.data?.message || requestError?.message || 'Try again later.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-4" refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
        {isMock && <MockDataNotice />}
        <Text className="text-2xl font-bold text-[#0C447C]">Lesson Attendance</Text>
        <Text className="mb-5 mt-2 text-gray-500">Mark attendance for your assigned lessons.</Text>
        <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
        {!loading && !error && records.length === 0 && <Text className="text-sm text-gray-500">No lessons to record.</Text>}
        {records.map((record) => <AttendanceCard
          key={record.id}
          lesson={record.lesson || 'Lesson'}
          student={record.student || record.studentName || 'Student'}
          time={record.scheduledStart ? new Date(record.scheduledStart).toLocaleString() : 'Time pending'}
          status={record.status}
          saving={savingId === record.id}
          onMarkAttendance={(status) => markAttendance(record.id, status)}
        />)}
      </ScrollView>
    </SafeAreaView>
  );
}
