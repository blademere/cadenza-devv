import { View } from 'react-native';
export default function Card({ children, style }) {
  return (
    <View className="my-2 rounded-xl bg-white p-4 shadow-sm" style={style}>
      {children}
    </View>
  );
}
