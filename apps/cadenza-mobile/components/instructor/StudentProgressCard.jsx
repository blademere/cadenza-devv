import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View, Text } from 'react-native';

export default function StudentProgressCard({ name, progress, materials = [], courses = [], attendanceRate = 0, absences = 0, lastLesson, status }) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || null);
  useEffect(() => {
    if (!courses.some((course) => course.id === selectedCourseId)) setSelectedCourseId(courses[0]?.id || null);
  }, [courses, selectedCourseId]);
  const selectedMaterials = useMemo(() => (
    selectedCourseId ? materials.filter((material) => material.courseId === selectedCourseId) : materials
  ), [materials, selectedCourseId]);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  return (
    <View className="mb-3 rounded-xl border border-[#E8E8E8] bg-white p-3">
      <View className="mb-3 flex-row items-center"><View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#D0E8F2]"><Text className="text-base font-bold text-[#0288D1]">{name.charAt(0)}</Text></View><View><Text className="text-sm font-semibold text-[#1A1A1A]">{name}</Text><Text className="text-xs text-[#8A8A8A]">{progress}% complete · {attendanceRate}% attendance</Text></View></View>
      <View className="h-[6px] overflow-hidden rounded-[3px] bg-[#E8E8E8]"><View className="h-full rounded-[3px] bg-[#4CAF50]" style={{ width: `${progress}%` }} /></View>
      <View className="mt-3 flex-row items-center justify-between"><Text className="flex-1 text-xs text-gray-500">{courses.map((course) => course.name).join(', ') || 'Course pending'}</Text><Text className={`text-xs font-bold ${status === 'NEEDS_ATTENTION' ? 'text-red-600' : 'text-emerald-600'}`}>{status === 'NEEDS_ATTENTION' ? 'Needs attention' : 'On track'}</Text></View>
      <Text className="mt-2 text-xs text-gray-500">Last lesson: {lastLesson?.scheduledStart ? new Date(lastLesson.scheduledStart).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'No lesson recorded'} · Absences: {absences}</Text>
      {courses.length > 0 ? <View className="mt-4 flex-row flex-wrap gap-2">{courses.map((course) => <Pressable key={course.id} onPress={() => setSelectedCourseId(course.id)} className={`rounded-full px-3 py-2 ${selectedCourseId === course.id ? 'bg-[#D0E8F2]' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${selectedCourseId === course.id ? 'text-[#0C447C]' : 'text-gray-600'}`}>{course.name}</Text></Pressable>)}</View> : null}
      <Text className="mt-4 text-xs font-semibold uppercase text-gray-500">{selectedCourse ? `${selectedCourse.name} materials` : 'Course materials'} ({selectedMaterials.length})</Text>
      {selectedMaterials.length === 0 ? <Text className="mt-2 text-sm text-gray-500">No materials assigned for this course.</Text> : selectedMaterials.map((material) => <Pressable key={material.id} onPress={() => router.push({ pathname: '/instructor/material-details', params: { materialId: material.id } })} className="mt-2 flex-row items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><Text className="mr-2 flex-1 text-sm text-gray-700">{material.title}</Text><Text className="text-xs font-semibold text-[#0C447C]">Download</Text></Pressable>)}
    </View>
  );
}
