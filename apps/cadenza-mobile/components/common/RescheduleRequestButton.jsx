import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { requestInstructorReschedule } from '../../services/instructor.service';

const ACCENT = '#0C447C';

export default function RescheduleRequestButton({ sessionId, lesson, scheduledStart }) {
  const [request, setRequest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submitRequest() {
    try {
      setSaving(true); setError('');
      const requestedStart = new Date(scheduledStart);
      requestedStart.setDate(requestedStart.getDate() + 7);
      setRequest(await requestInstructorReschedule(sessionId, requestedStart.toISOString(), `Instructor requested a schedule change for ${lesson}.`));
    } catch (requestError) { setError(requestError?.message || 'Could not create the reschedule request.'); }
    finally { setSaving(false); }
  }
  if (request) return <View className="mt-4 rounded-xl bg-amber-50 p-3"><Text className="font-semibold text-amber-800">Reschedule request sent to Frontdesk</Text><Text className="mt-1 text-sm text-amber-700">Frontdesk will generate and manage the available replacement schedules.</Text></View>;
  return <View className="mt-4"><Pressable accessibilityRole="button" disabled={saving} onPress={submitRequest} className="self-start flex-row items-center rounded-xl border border-[#0C447C] px-4 py-2">{saving && <ActivityIndicator color={ACCENT} size="small" />}<Text className="ml-2 font-semibold" style={{ color: ACCENT }}>{saving ? 'Sending...' : 'Request schedule change'}</Text></Pressable>{!!error && <Text accessibilityRole="alert" className="mt-2 text-sm text-red-700">{error}</Text>}</View>;
}
