import { View, ViewStyle, StyleProp } from "react-native";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, style }: CardProps) {
  return <View className="my-2 rounded-xl bg-white p-4 shadow-sm" style={style}>{children}</View>;
}