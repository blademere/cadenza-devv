// app/instructor/dashboard.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fonts } from '../../themes/fonts';
import Loader from '../../components/ui/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatCard from '../../components/instructor/StatCard';
import StudentProgressCard from '../../components/instructor/StudentProgressCard';
import { getInstructorDashboard } from '../../services/instructor.service';
export default function InstructorDashboardScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await getInstructorDashboard();
      setData(result);
    } catch {
      setError('Unable to load your dashboard. Please try again.');
    }
  }, []);
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchDashboard();
      setLoading(false);
    })();
  }, [fetchDashboard]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);
  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F7FB]">
        <Loader />
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F7FB]">
        <ErrorMessage
          message={error ?? 'Something went wrong.'}
          onRetry={fetchDashboard}
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <ScrollView
        contentContainerClassName="px-4 pb-8 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting */}
        <Text
          className="text-sm text-[#8A8A8A]"
          style={{ fontFamily: fonts.regular }}
        >
          Welcome back,
        </Text>
        <Text
          className="mb-2 text-[22px] text-[#1A1A1A]"
          style={{ fontFamily: fonts.bold }}
        >
          {data.instructorName}
        </Text>

        {/* Stats Grid */}
        <View className="-mx-1.5 mb-1 flex-row flex-wrap">
          <StatCard
            label="ASSIGNED STUDENTS"
            value={data.stats.assignedStudents}
            icon={null}
          />
          <StatCard
            label="TODAY'S SESSIONS"
            value={data.stats.todaySessions}
            icon={null}
          />
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base text-[#1A1A1A]" style={{ fontFamily: fonts.bold }}>Today’s lessons</Text>
            <Pressable onPress={() => router.push('/instructor/schedule')} hitSlop={8}>
              <Text className="text-sm font-semibold text-[#0C447C]">Full schedule</Text>
            </Pressable>
          </View>
          {data.todaySchedule?.length ? data.todaySchedule.map((lesson) => (
            <View key={lesson.id} className="border-t border-gray-100 py-3">
              <Text className="font-semibold text-gray-900">{lesson.time} · {lesson.studentName}</Text>
              <Text className="mt-1 text-sm text-gray-500">{lesson.lesson || 'Lesson'}{lesson.location ? ` · ${lesson.location}` : ''}</Text>
            </View>
          )) : <Text className="py-3 text-sm text-gray-500">No lessons scheduled today.</Text>}
        </View>

        <Pressable onPress={() => router.push('/instructor/progress')} className="mt-3 rounded-2xl bg-[#E6F1FB] p-4">
          <Text className="text-xs font-semibold uppercase text-gray-600">Progress & Attendance</Text>
          <Text className="mt-2 text-sm font-bold text-[#0C447C]">Record lessons and add feedback</Text>
        </Pressable>

        {/* Student Progress Overview */}
        <Text
          className="mb-2 mt-2 text-xs uppercase tracking-[0.5px] text-[#1A1A1A]"
          style={{ fontFamily: fonts.bold }}
        >
          STUDENT PROGRESS OVERVIEW
        </Text>
        {(!data.studentProgress || data.studentProgress.length === 0) ? (
          <Text
            className="mb-2 text-[13px] text-[#8A8A8A]"
            style={{ fontFamily: fonts.regular }}
          >
            No progress data available.
          </Text>
        ) : (
          data.studentProgress.map((student) => (
            <StudentProgressCard
              key={student.id}
              name={student.name}
              progress={student.progress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
