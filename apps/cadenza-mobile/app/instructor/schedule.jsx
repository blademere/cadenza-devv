import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function loadSchedule() {
    try {
      setError(null);
      setSchedules(await getInstructorSchedule());
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load schedule.');
      setSchedules([]);
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

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshSchedule} />}
      >
        <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Schedule</Text>
        <Text className="mt-2 text-gray-500">Lessons assigned to you from the database.</Text>
        <ResourceFeedback loading={loading} error={error} onRetry={loadSchedule} />
        {loading && <ActivityIndicator className="mt-6" size="small" color={ACCENT} />}
        {!loading && !error && schedules.length === 0 && <Text className="mt-6 text-sm text-gray-500">No lessons scheduled.</Text>}
        {schedules.map((item) => (
          <View key={item.id} className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <Text className="text-base font-bold" style={{ color: ACCENT }}>{item.lesson || 'Lesson'}</Text>
            <Text className="mt-2 font-semibold text-gray-900">{formatDate(item.scheduledStart)}</Text>
            <Text className="mt-1 text-sm text-gray-600">{formatTime(item.scheduledStart)} - {formatTime(item.scheduledEnd)}</Text>
            <Text className="mt-2 text-sm text-gray-600">Student: {item.studentName || item.student || 'Student'}</Text>
            {item.room?.name && <Text className="mt-1 text-sm text-gray-600">Room: {item.room.name}</Text>}
            <Text className="mt-2 text-xs font-semibold uppercase text-gray-500">{item.attendance?.status || item.status || 'Scheduled'}</Text>
            {item.scheduleRequest?.status === 'PENDING' ? <Text className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Reschedule request pending Front Desk review.</Text> : <RescheduleRequestButton sessionId={item.id} lesson={item.lesson || 'Lesson'} scheduledStart={item.scheduledStart} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
