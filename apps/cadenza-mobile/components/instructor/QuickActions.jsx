// components/instructor/QuickActions.jsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../ui/Button';
export default function QuickActions() {
  const router = useRouter();
  return (
    <View className="mb-4 mt-2">
      <View className="mb-3">
        <Button title="Progress, Attendance & Feedback" onPress={() => router.push('/instructor/progress')} />
      </View>
    </View>
  );
}
