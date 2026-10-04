import React from "react";
import { View, Text } from "react-native";
import { fonts } from "../../themes/fonts";

interface Props {
  profile: {
    name: string;
    specialization: string;
    email: string;
  };
}

export default function ProfileCard({ profile }: Props) {
  return (
    <View className="rounded-2xl bg-white p-4">
      <Text
        className="text-lg text-[#1A1A1A]"
        style={{ fontFamily: fonts.bold }}
      >
        {profile.name}
      </Text>

      <Text
        className="mt-2 text-[#666]"
        style={{ fontFamily: fonts.regular }}
      >
        Specialization
      </Text>

      <Text
        className="text-[#1A1A1A]"
        style={{ fontFamily: fonts.regular }}
      >
        {profile.specialization}
      </Text>

      <Text
        className="mt-3 text-[#666]"
        style={{ fontFamily: fonts.regular }}
      >
        Email
      </Text>

      <Text
        className="text-[#1A1A1A]"
        style={{ fontFamily: fonts.regular }}
      >
        {profile.email}
      </Text>
    </View>
  );
}