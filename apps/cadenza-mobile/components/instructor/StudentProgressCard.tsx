import React from 'react';
import { View, Text } from 'react-native';

interface StudentProgressCardProps {
  name: string;
  progress: number; // 0-100
}

export default function StudentProgressCard({ name, progress }: StudentProgressCardProps) {
  return (
    <View className="mb-3 rounded-xl border border-[#E8E8E8] bg-white p-3">
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#D0E8F2]">
          <Text className="text-base font-bold text-[#0288D1]">{name.charAt(0)}</Text>
        </View>
        <View>
          <Text className="text-sm font-semibold text-[#1A1A1A]">{name}</Text>
          <Text className="text-xs text-[#8A8A8A]">{progress}% complete</Text>
        </View>
      </View>
      <View className="h-[6px] overflow-hidden rounded-[3px] bg-[#E8E8E8]">
        <View className="h-full rounded-[3px] bg-[#4CAF50]" style={{ width: `${progress}%` }} />
      </View>
    </View>
  );
}
