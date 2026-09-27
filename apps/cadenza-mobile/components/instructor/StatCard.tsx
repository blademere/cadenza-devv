import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  icon?: React.ReactNode | null;
  label: string;
  value: number;
}

export default function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <View className="mb-3 flex-1 items-center rounded-xl border border-[#E8E8E8] bg-white p-3 mx-[6px]">
      {icon && (
        <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-[#F0F0F0]">
          {icon}
        </View>
      )}
      <Text className="mb-1 text-center text-[11px] font-semibold uppercase text-[#8A8A8A]">
        {label}
      </Text>
      <Text className="text-xl font-bold text-[#1A1A1A]">{value}</Text>
    </View>
  );
}
