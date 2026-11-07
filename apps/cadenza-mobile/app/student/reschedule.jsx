import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chooseStudentSchedule, getStudentSchedule } from '../../services/studentService';
import useMobileResource from '../../hooks/useMobileResource';

const ACCENT = '#0C447C';

export default function StudentReschedule() {
  const { data, loading, error, refresh } = useMobileResource(getStudentSchedule);
  const [savingId, setSavingId] = useState(null);
  const [choiceError, setChoiceError] = useState('');
  const [selectedChoices, setSelectedChoices] = useState({});
  const [expandedRequests, setExpandedRequests] = useState({});
  const requests = (data?.schedules || []).filter((item) => item.scheduleRequest?.status === 'PENDING' && item.scheduleRequest?.generatedOptions?.length);

  async function submitChoice(item) {
    const optionId = selectedChoices[item.id];
    if (!optionId) return;
    try { setChoiceError(''); setSavingId(item.id); await chooseStudentSchedule(item.id, optionId); await refresh(); } catch (submitError) { setChoiceError(submitError?.response?.data?.message || submitError?.message || 'Unable to save your schedule choice.'); } finally { setSavingId(null); }
  }

  return <SafeAreaView className="flex-1 bg-[#F7F7FB]"><ScrollView contentContainerClassName="px-4 pb-32 pt-4" refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
    <Text className="text-2xl font-bold" style={{ color: ACCENT }}>Reschedule</Text>
    <Text className="mt-2 text-gray-500">Front Desk generated these options. Choose exactly one, then submit it for approval.</Text>
    {loading && <ActivityIndicator className="mt-6" color={ACCENT} />}
    {!!error && <Text className="mt-4 text-sm text-red-700">{error.message || error}</Text>}
    {!loading && !requests.length && <Text className="mt-6 text-sm text-gray-500">No reschedule requests yet.</Text>}
    {requests.map((item) => { const request = item.scheduleRequest; const submitted = !!request.studentChoice; const selectedId = submitted ? request.studentChoice : selectedChoices[item.id]; const expanded = expandedRequests[item.id] !== false; return <View key={item.id} className="mt-5 rounded-2xl bg-white p-4 shadow-sm"><Pressable onPress={() => setExpandedRequests((current) => ({ ...current, [item.id]: !expanded }))} className="flex-row items-center justify-between"><View className="flex-1"><Text className="text-base font-bold" style={{ color: ACCENT }}>{item.courseName || item.lesson || 'Lesson'}</Text><Text className="mt-1 text-sm text-gray-600">{submitted ? 'Submitted — waiting for Front Desk' : 'Action required'}</Text></View><Text className="ml-3 text-xl font-bold text-[#0C447C]">{expanded ? '−' : '+'}</Text></Pressable>{expanded && <><Text className="mt-1 text-sm text-gray-600">Instructor: {item.instructor?.name || 'Instructor'}</Text><Text className="mt-1 text-sm text-gray-600">Current: {item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : 'Schedule pending'}</Text><View className="mt-4">{request.generatedOptions.map((option) => <Pressable key={option.id} disabled={submitted || !!savingId} onPress={() => setSelectedChoices((current) => ({ ...current, [item.id]: option.id }))} className={`mt-2 rounded-xl border p-3 ${selectedId === option.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}><Text className="font-semibold text-gray-900">{option.date} · {option.time}</Text><Text className="mt-1 text-xs text-gray-500">{selectedId === option.id ? 'Selected' : 'Tap to choose'}</Text></Pressable>)}</View>{!submitted && <Pressable disabled={!!savingId || !selectedId} onPress={() => submitChoice(item)} className={`mt-4 self-start rounded-xl px-4 py-3 ${selectedId ? 'bg-[#0C447C]' : 'bg-gray-300'}`}><Text className="font-semibold text-white">{savingId === item.id ? 'Submitting...' : 'Submit schedule'}</Text></Pressable>}{!!choiceError && <Text className="mt-3 text-sm text-red-700">{choiceError}</Text>}<Text className="mt-4 text-sm font-semibold text-amber-800">{submitted ? 'Your choice was sent to Front Desk for approval.' : 'Select one schedule, then submit.'}</Text></>}</View>; })}
  </ScrollView></SafeAreaView>;
}
