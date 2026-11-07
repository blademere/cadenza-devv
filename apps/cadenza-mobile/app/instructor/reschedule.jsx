import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInstructorSchedule } from '../../services/instructor.service';

const ACCENT = '#0C447C';

export default function InstructorReschedulePage() {
  const [requests, setRequests] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  async function load() { try { setError(''); const data = await getInstructorSchedule(); setRequests((data?.schedules || []).filter((item) => item.rescheduled !== true && item.scheduleRequest?.status === 'PENDING' && item.scheduleRequest?.studentChoice)); } catch (e) { setError(e?.message || 'Unable to load reschedule updates.'); } finally { setLoading(false); setRefreshing(false); } }
  useEffect(() => { void load(); }, []);
  return <SafeAreaView className="flex-1 bg-[#F7F7FB]"><ScrollView contentContainerClassName="px-4 pb-8 pt-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}><Text className="text-2xl font-bold" style={{ color: ACCENT }}>Reschedule</Text><Text className="mt-2 text-gray-500">Reshedule request.</Text>{loading && <ActivityIndicator className="mt-6" color={ACCENT} />}{!!error && <Text className="mt-4 text-sm text-red-700">{error}</Text>}{!loading && !requests.length && <Text className="mt-6 text-sm text-gray-500">No student schedule selections yet.</Text>}{requests.map((item) => { const request = item.scheduleRequest; const selected = request.generatedOptions?.find((option) => option.id === request.studentChoice); return <View key={item.id} className="mt-5 rounded-2xl bg-white p-4 shadow-sm"><Text className="text-base font-bold" style={{ color: ACCENT }}>{item.lesson || 'Lesson'}</Text><Text className="mt-1 text-sm text-gray-600">Student: {item.studentName || item.student || 'Student'}</Text><Text className="mt-1 text-sm text-gray-600">Current: {item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : 'Schedule pending'}</Text><Text className="mt-4 text-sm font-semibold text-amber-800">Student selection — waiting for Front Desk approval</Text>{selected && <Text className="mt-2 rounded-xl bg-blue-50 p-3 font-semibold text-blue-900">{selected.date} · {selected.time}</Text>}</View>; })}</ScrollView></SafeAreaView>;
}
