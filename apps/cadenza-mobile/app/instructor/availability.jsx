import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useMobileResource from '../../hooks/useMobileResource';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';
import { getAvailability } from '../../services/instructorAvailabilityService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function rowsFromResponse(response) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(payload) ? payload : payload?.items ?? [];
}

function formatTime(value) {
  if (!value) return '';
  const [hour, minute] = String(value).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return String(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function InstructorAvailabilityPage() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getAvailability);
  const rows = rowsFromResponse(data);

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {isMock && <MockDataNotice />}
        <Text className="text-2xl font-bold text-[#0C447C]">My Availability</Text>
        <Text className="mb-5 mt-2 text-gray-500">Your weekly teaching hours.</Text>
        <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
        {!loading && !error && DAYS.map((day, index) => {
          const dayRows = rows.filter((item) => String(item.day_of_week ?? item.dayOfWeek) === day || Number(item.day_of_week ?? item.dayOfWeek) === index + 1);
          return (
            <View key={day} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="mb-2 font-bold text-gray-900">{day}</Text>
              {dayRows.length ? dayRows.map((item) => (
                <Text key={item.id} className="py-1 text-gray-600">
                  {formatTime(item.time_slot?.start_time ?? item.start_time ?? (item.startMinute == null ? null : `${String(Math.floor(item.startMinute / 60)).padStart(2, '0')}:${String(item.startMinute % 60).padStart(2, '0')}`))}
                  {' – '}
                  {formatTime(item.time_slot?.end_time ?? item.end_time ?? (item.endMinute == null ? null : `${String(Math.floor(item.endMinute / 60)).padStart(2, '0')}:${String(item.endMinute % 60).padStart(2, '0')}`))}
                </Text>
              )) : <Text className="text-sm text-gray-500">No availability set.</Text>}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
