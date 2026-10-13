import { Pressable, Text, View } from 'react-native';

export function MockDataNotice() {
  return (
    <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <Text className="text-xs font-semibold text-amber-800">
        Demo data · local mock
      </Text>
    </View>
  );
}

export function ResourceFeedback({ loading, error, onRetry }) {
  if (loading) {
    return <Text className="mt-6 text-center text-gray-500">Loading…</Text>;
  }

  if (!error) return null;

  return (
    <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
      <Text className="font-semibold text-red-700">Could not load data</Text>
      <Text className="mt-1 text-sm text-red-700">{error}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="mt-3 self-start rounded-lg bg-red-700 px-4 py-2"
      >
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}
