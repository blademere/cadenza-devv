import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { requestInstructorReschedule } from '../../services/instructor.service';

const ACCENT = '#0C447C';

function getDefaultDate(value) {
  const scheduledDate = value ? new Date(value) : null;
  const date = scheduledDate && !Number.isNaN(scheduledDate.getTime()) && scheduledDate > new Date()
    ? scheduledDate
    : new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDefaultTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '16:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function RescheduleRequestButton({ sessionId, lesson, scheduledStart }) {
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [request, setRequest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openForm() {
    setDate(getDefaultDate(scheduledStart));
    setTime(getDefaultTime(scheduledStart));
    setReason('');
    setError('');
    setVisible(true);
  }

  async function submitRequest() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('Enter a valid date (YYYY-MM-DD) and time (24-hour HH:MM).');
      return;
    }
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const requestedStart = new Date(year, month - 1, day, hours, minutes);
    const validCalendarDate = requestedStart.getFullYear() === year
      && requestedStart.getMonth() === month - 1
      && requestedStart.getDate() === day;
    if (!validCalendarDate || requestedStart <= new Date()) {
      setError('Choose a future date and time.');
      return;
    }

    try {
      setSaving(true);
      const created = await requestInstructorReschedule(sessionId, requestedStart.toISOString(), reason.trim());
      setRequest(created);
      setVisible(false);
    } catch (requestError) {
      setError(requestError?.message || 'Could not create the reschedule request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {request ? (
        <View className="mt-4 rounded-xl bg-amber-50 p-3">
          <Text className="font-semibold text-amber-800">Reschedule request pending</Text>
          <Text className="mt-1 text-sm text-amber-700">Requested: {new Date(request.requestedStart).toLocaleString()}</Text>
          <Text className="mt-1 text-xs text-amber-700">Front Desk will review this request. The lesson time has not changed yet.</Text>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={openForm} className="mt-4 self-start rounded-xl border border-[#0C447C] px-4 py-2">
          <Text className="font-semibold" style={{ color: ACCENT }}>Request reschedule</Text>
        </Pressable>
      )}

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !saving && setVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="max-h-[85%] rounded-t-3xl bg-white p-5" keyboardShouldPersistTaps="handled">
            <Text className="text-xl font-bold text-gray-900">Request lesson reschedule</Text>
            <Text className="mt-1 text-gray-500">{lesson}. Front Desk must review the request before the lesson time changes.</Text>
            <Text className="mb-2 mt-5 font-semibold text-gray-800">Preferred date</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" accessibilityLabel="Preferred reschedule date" className="rounded-xl border border-gray-300 px-4 py-3 text-gray-900" />
            <Text className="mb-2 mt-4 font-semibold text-gray-800">Preferred start time</Text>
            <TextInput value={time} onChangeText={setTime} placeholder="HH:MM (24-hour)" accessibilityLabel="Preferred reschedule time" keyboardType="numbers-and-punctuation" className="rounded-xl border border-gray-300 px-4 py-3 text-gray-900" />
            <Text className="mb-2 mt-4 font-semibold text-gray-800">Reason (optional)</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Add a note for the admin or front desk" multiline textAlignVertical="top" className="min-h-20 rounded-xl border border-gray-300 px-4 py-3 text-gray-900" />
            {!!error && <Text accessibilityRole="alert" className="mt-3 text-sm text-red-700">{error}</Text>}
            <View className="mb-5 mt-5 flex-row gap-3">
              <Pressable disabled={saving} onPress={() => setVisible(false)} className="flex-1 items-center rounded-xl bg-gray-100 py-3">
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable disabled={saving} onPress={submitRequest} className="flex-1 flex-row items-center justify-center rounded-xl bg-[#0C447C] py-3">
                {saving && <ActivityIndicator color="white" size="small" />}
                <Text className="ml-2 font-semibold text-white">{saving ? 'Submitting…' : 'Submit request'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
