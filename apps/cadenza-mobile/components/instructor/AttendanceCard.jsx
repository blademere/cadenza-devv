import { Text, TouchableOpacity, View } from 'react-native';
import { fonts } from '../../themes/fonts';

export default function AttendanceCard({ lesson, student, time, status, saving = false, onMarkAttendance }) {
  const marked = status && !['SCHEDULED', 'UPCOMING', 'PENDING'].includes(String(status).toUpperCase());

  return (
    <View className="mb-3 rounded-2xl border border-gray-100 bg-white p-4">
      <Text className="mb-3 text-base text-[#1A1A1A]" style={{ fontFamily: fonts.bold }}>{lesson}</Text>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-sm text-[#555]" style={{ fontFamily: fonts.regular }}>{student}</Text>
        {!marked && <View className="flex-row">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mark present" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => onMarkAttendance?.('PRESENT')} className="mr-2 rounded-lg bg-green-100 px-3 py-2">
            <Text className="font-semibold text-green-800">Present</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mark absent" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => onMarkAttendance?.('ABSENT')} className="rounded-lg bg-red-100 px-3 py-2">
            <Text className="font-semibold text-red-800">Absent</Text>
          </TouchableOpacity>
        </View>}
      </View>
      <Text className="mt-3 text-sm text-[#777]" style={{ fontFamily: fonts.regular }}>{time}</Text>
      {!!status && <Text accessibilityLiveRegion="polite" className="mt-2 text-xs text-[#777]">{saving ? 'Saving attendance…' : `Attendance: ${status}`}</Text>}
    </View>
  );
}
