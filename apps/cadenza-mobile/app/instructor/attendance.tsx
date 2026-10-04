import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
} from "react-native";

import { fonts } from "../../themes/fonts";
import { schedules } from "@/constants/schedules";

import AttendanceCard from "../../components/instructor/AttendanceCard";


export default function AttendancePage() {

  // temporary selected day
  const today = "Monday";


  const todayLessons = schedules.filter(
    item => item.day === today
  );


  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">

      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
      >

        <Text
          className="mb-4 ml-1 text-lg uppercase tracking-[0.5px] text-[#1A1A1A]"
          style={{
            fontFamily: fonts.bold
          }}
        >
          My Lessons
        </Text>


        {
          todayLessons.length > 0 ? (

            todayLessons.map((item) => (

              <AttendanceCard
                key={item.id}
                lesson={item.lesson}
                student={item.student}
                time={item.time}
              />

            ))

          ) : (

            <Text
              className="text-sm text-[#999]"
              style={{
                fontFamily: fonts.regular
              }}
            >
              No lessons today.
            </Text>

          )
        }


      </ScrollView>

    </SafeAreaView>
  );
}