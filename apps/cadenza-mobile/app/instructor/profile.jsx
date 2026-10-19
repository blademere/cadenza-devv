import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';
import useMobileResource from '../../hooks/useMobileResource';
import { getInstructorProfile } from '../../services/instructor.service';

export default function InstructorProfilePage() {
  const { data, loading, error, refresh } = useMobileResource(getInstructorProfile);
  const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(' ');
  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-4">
        <Text className="mb-4 text-lg font-bold uppercase tracking-[0.5px] text-[#1A1A1A]">My Profile</Text>
        <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
        {data && <View className="rounded-2xl bg-white p-5">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-[#D0E8F2]"><Text className="text-2xl font-bold text-[#0288D1]">{data.firstName?.charAt(0) || 'I'}</Text></View>
          <Text className="text-xl font-bold text-[#1A1A1A]">{fullName || 'Instructor'}</Text>
          <Text className="mt-2 text-gray-600">{data.email || 'Email not provided'}</Text>
          <Text className="mt-1 text-gray-600">{data.phone || 'Phone not provided'}</Text>
          {!!data.specialty && <Text className="mt-1 text-gray-600">Specialty: {data.specialty}</Text>}
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}
