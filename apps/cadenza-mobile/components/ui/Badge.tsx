import { View, Text } from "react-native";

interface BadgeProps {
  label: string;
  color?: string;
}

export default function Badge({ label, color = "#063970" }: BadgeProps) {
  return (
    <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}1A` }}>
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
