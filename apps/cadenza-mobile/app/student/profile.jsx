import { ScrollView, Text, View } from 'react-native';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentProfile } from '../../services/studentService';
import { MockDataNotice, ResourceFeedback } from '../../components/common/ResourceFeedback';

const ACCENT = '#0C447C';

export default function StudentProfile() {
  const { data, loading, error, isMock, refresh } = useMobileResource(getStudentProfile);
  const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(' ');
  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>My Profile</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {data && <>
        <View className="mt-6 items-center rounded-3xl bg-[#E6F1FB] p-6">
          <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT }}>
            <Text className="text-3xl font-bold text-white">{data.firstName?.charAt(0) || '?'}</Text>
          </View>
          <Text className="mt-4 text-xl font-bold text-gray-800">{fullName || 'Student'}</Text>
          <Text className="mt-1 text-gray-500">{data.email || 'Email not provided'}</Text>
        </View>
        <View className="mt-5 rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-bold text-gray-800">Personal Information</Text>
          <ProfileField label="Full Name" value={fullName} />
          <ProfileField label="Email Address" value={data.email} />
          <ProfileField label="Contact Number" value={data.phone} />
        </View>
      </>}
    </ScrollView>
  );
}

function ProfileField({ label, value }) {
  return <View className="mt-4"><Text className="text-sm text-gray-500">{label}</Text><Text className="mt-1 text-base text-gray-800">{value || 'Not provided'}</Text></View>;
}
