// components/instructor/QuickActions.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../ui/Button';

export default function QuickActions() {
  const router = useRouter();

  return (
    <View className="mt-2 flex-row flex-wrap justify-between mb-4">
      <View className="mb-3 w-[48%]">
        <Button title="View Attendance" onPress={() => router.push('/instructor/attendance?mode=view')} />
      </View>
      <View className="mb-3 w-[48%]">
        <Button title="Record Attendance" onPress={() => router.push('/instructor/attendance?mode=record')} />
      </View>
      <View className="mb-3 w-[48%]">
        <Button title="Lesson Progress" onPress={() => router.push('/instructor/progress')} />
      </View>
      <View className="mb-3 w-[48%]">
        <Button title="View History" variant="outline" onPress={() => router.push('/instructor/progress')} />
      </View>
    </View>
  );
}
