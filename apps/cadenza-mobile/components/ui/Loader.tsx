import { ActivityIndicator, View } from "react-native";

export default function Loader() {
  return (
    <View className="items-center justify-center">
      <ActivityIndicator size="large" />
    </View>
  );
}