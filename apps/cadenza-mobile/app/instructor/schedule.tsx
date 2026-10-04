import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { fonts } from "../../themes/fonts";
import { days } from "../../constants/days";

import ScheduleCard from "../../components/instructor/ScheduleCard";

import { getSchedule } from "../../services/instructorScheduleService";

function extractArray(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState("Monday");

  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadSchedule() {
    try {
      setLoading(true);

      const response = await getSchedule();

      setAllSchedules(extractArray(response));
    } catch (error) {
      console.error("Failed to load schedule:", error);

      setAllSchedules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, []);

  const filteredSchedules = allSchedules.filter(
    (item) => item.day_of_week?.toLowerCase() === selectedDay.toLowerCase(),
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      {/* Day Tabs */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 mt-4"
      >
        {days.map((day) => (
          <TouchableOpacity
            key={day.label}
            onPress={() => setSelectedDay(day.label)}
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
              selectedDay === day.label ? "bg-blue-600" : "bg-white"
            }`}
          >
            <Text
              className={`text-sm ${
                selectedDay === day.label ? "text-white" : "text-[#555]"
              }`}
              style={{
                fontFamily: fonts.bold,
              }}
            >
              {day.short}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="mb-4 text-lg uppercase tracking-[0.5px] text-[#1A1A1A]"
          style={{
            fontFamily: fonts.bold,
          }}
        >
          {selectedDay} Schedule
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : filteredSchedules.length > 0 ? (
          filteredSchedules.map((item) => (
            <ScheduleCard
              key={item.id}
              lesson="Available"
              time={`${formatTime(item.time_slot?.start_time)} - ${formatTime(
                item.time_slot?.end_time,
              )}`}
              student="Available"
            />
          ))
        ) : (
          <Text
            className="text-sm text-[#999]"
            style={{
              fontFamily: fonts.regular,
            }}
          >
            No schedule available.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  // MySQL TIME format: HH:mm:ss
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    const [hour, minute] = value.split(":");

    const h = Number(hour);
    const m = Number(minute);

    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;

    return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
