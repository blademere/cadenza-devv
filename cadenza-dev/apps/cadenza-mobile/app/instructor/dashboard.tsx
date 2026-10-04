// app/instructor/dashboard.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '../../themes/fonts';

import Loader from '../../components/ui/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatCard from '../../components/instructor/StatCard';
import StudentProgressCard from '../../components/instructor/StudentProgressCard';

import { getInstructorDashboard } from '../../services/instructor.service';
import type { InstructorDashboardData } from '../../types/instructor';

export default function InstructorDashboardScreen() {
  const [data, setData] = useState<InstructorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <ErrorMessage message={error ?? 'Something went wrong.'} onRetry={fetchDashboard} />
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
        <Text className="text-sm text-[#8A8A8A]" style={{ fontFamily: fonts.regular }}>
          Welcome back,
        </Text>
        <Text className="mb-2 text-[22px] text-[#1A1A1A]" style={{ fontFamily: fonts.bold }}>
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


        {/* Student Progress Overview */}
        <Text
          className="mb-2 mt-2 text-xs uppercase tracking-[0.5px] text-[#1A1A1A]"
          style={{ fontFamily: fonts.bold }}
        >
          STUDENT PROGRESS OVERVIEW
        </Text>
        {data.studentProgress.length === 0 ? (
          <Text className="mb-2 text-[13px] text-[#8A8A8A]" style={{ fontFamily: fonts.regular }}>
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
