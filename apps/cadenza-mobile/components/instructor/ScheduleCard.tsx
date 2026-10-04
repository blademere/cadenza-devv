import React from "react";
import { View, Text } from "react-native";

import { fonts } from "../../themes/fonts";

interface Props {
  lesson: string;
  time: string;
  student: string;
}

export default function ScheduleCard({ lesson, time, student }: Props) {
  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <Text
        className="mb-3 text-base text-[#1A1A1A]"
        style={{
          fontFamily: fonts.bold,
        }}
      >
        {lesson}
      </Text>

      <View className="flex-row justify-between">
        <Text
          className="text-sm text-[#555]"
          style={{
            fontFamily: fonts.regular,
          }}
        >
          {time}
        </Text>

        <Text
          className="text-sm text-[#555]"
          style={{
            fontFamily: fonts.regular,
          }}
        >
          {student}
        </Text>
      </View>
    </View>
  );
}
