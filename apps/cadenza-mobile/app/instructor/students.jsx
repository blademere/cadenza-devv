import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInstructorDashboard } from '../../services/instructor.service';
import StudentProgressCard from '../../components/instructor/StudentProgressCard';
import Loader from '../../components/ui/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';

const ACCENT = '#0C447C';

export default function InstructorStudentsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadStudents = useCallback(async () => {
    try {
      setError(null);
      setData(await getInstructorDashboard());
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load assigned students.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  if (loading) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F7FB]"><Loader /></SafeAreaView>;
  if (error || !data) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F7FB]"><ErrorMessage message={error || 'Something went wrong.'} onRetry={loadStudents} /></SafeAreaView>;

  const students = data.studentProgress || [];
  return <SafeAreaView className="flex-1 bg-[#F7F7FB]"><ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadStudents(); }} />}>
    <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Students</Text>
    <Text className="mt-2 leading-5 text-gray-500">Review the students assigned to you and their lesson progress.</Text>
    <View className="mt-5 flex-row rounded-2xl bg-white p-4"><View className="flex-1"><Text className="text-2xl font-bold" style={{ color: ACCENT }}>{students.length}</Text><Text className="mt-1 text-xs uppercase text-gray-500">Assigned students</Text></View><View className="flex-1 border-l border-gray-100 pl-4"><Text className="text-2xl font-bold text-emerald-600">{students.filter((student) => Number(student.progress) >= 75).length}</Text><Text className="mt-1 text-xs uppercase text-gray-500">On track</Text></View></View>
    <Text className="mb-2 mt-7 text-lg font-bold text-gray-900">Student progress</Text>
    {students.length === 0 ? <View className="rounded-2xl bg-white p-5"><Text className="text-gray-500">No assigned students yet.</Text></View> : students.map((student) => <StudentProgressCard key={student.id} name={student.name} progress={student.progress} />)}
  </ScrollView></SafeAreaView>;
}
