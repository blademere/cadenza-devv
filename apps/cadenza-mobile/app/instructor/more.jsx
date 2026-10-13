import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MockDataNotice } from '../../components/common/ResourceFeedback';
import { isMockDataEnabled } from '../../services/dataMode';
import { useEffect, useState } from 'react';

const ACCENT = '#0C447C';

function MoreLink({ icon, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mr-4 h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
        <Ionicons name={icon} size={22} color={ACCENT} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-900">{title}</Text>
        <Text className="mt-1 text-sm text-gray-500">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </Pressable>
  );
}

export default function InstructorMorePage() {
  const [isMock, setIsMock] = useState(false);
  useEffect(() => { isMockDataEnabled().then(setIsMock); }, []);

  return (
    <ScrollView className="flex-1 bg-[#F7F7FB]" contentContainerClassName="px-4 pb-8 pt-4">
      {isMock && <MockDataNotice />}
      <Text className="text-2xl font-bold text-[#0C447C]">More</Text>
      <Text className="mb-5 mt-2 text-gray-500">Account and instructor information.</Text>
      <MoreLink icon="person-outline" title="My Profile" subtitle="View your contact information" onPress={() => router.push('/instructor/profile')} />
      <MoreLink icon="time-outline" title="Availability" subtitle="View your weekly availability" onPress={() => router.push('/instructor/availability')} />
    </ScrollView>
  );
}
