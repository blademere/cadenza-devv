import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { getInstructorMaterial } from '../../services/instructor.service';
import useMobileResource from '../../hooks/useMobileResource';
import { API_BASE_URL } from '../../services/api';
import { getToken } from '../../services/authStorage';

const ACCENT = '#0C447C';
export default function InstructorMaterialDetails() {
  const { materialId } = useLocalSearchParams();
  const id = Array.isArray(materialId) ? materialId[0] : materialId;
  const load = useCallback(() => getInstructorMaterial(id), [id]);
  const { data, loading, error, refresh } = useMobileResource(load);
  const [busy, setBusy] = useState(false);
  async function openMaterial() {
    if (!data?.fileUrl || busy) return;
    setBusy(true);
    try {
      const token = await getToken();
      const target = `${FileSystem.cacheDirectory}cadenza-instructor-material-${id}`;
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}/instructor/materials/${encodeURIComponent(id)}/file`, target, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status !== 200) throw new Error(`Unable to open file (HTTP ${result.status}).`);
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(result.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: data.type || 'application/octet-stream' });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: data.type || 'application/octet-stream' });
      } else {
        throw new Error('No compatible viewer is available.');
      }
    } catch (openError) { Alert.alert('Unable to open file', openError?.message || 'Please try again.'); } finally { setBusy(false); }
  }
  async function download() {
    if (!data?.fileUrl || busy) return;
    setBusy(true);
    try {
      const token = await getToken();
      const target = `${FileSystem.cacheDirectory}cadenza-instructor-material-${id}`;
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}/instructor/materials/${encodeURIComponent(id)}/file`, target, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status !== 200) throw new Error(`Unable to download file (HTTP ${result.status}).`);
      if (!(await Sharing.isAvailableAsync())) throw new Error('No compatible download/share app is available.');
      await Sharing.shareAsync(result.uri, { mimeType: data.type || 'application/octet-stream' });
    } catch (downloadError) { Alert.alert('Unable to open file', downloadError?.message || 'Please try again.'); } finally { setBusy(false); }
  }
  return <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}><Pressable onPress={() => router.replace('/instructor/students')} className="mb-5 self-start rounded-xl border border-[#0C447C] px-4 py-2"><Text className="font-semibold" style={{ color: ACCENT }}>Back</Text></Pressable><Text className="text-2xl font-bold" style={{ color: ACCENT }}>Material Details</Text>{loading && <ActivityIndicator className="mt-6" color={ACCENT} />}{error && <Text className="mt-4 text-red-700" onPress={refresh}>{error.message || String(error)}</Text>}{data && <View className="mt-6 rounded-3xl border border-gray-200 p-5"><Text className="text-xl font-bold text-gray-800">{data.title}</Text><Pressable disabled={busy || !data.fileUrl} onPress={openMaterial} className="mt-6 items-center rounded-2xl border p-4" style={{ borderColor: ACCENT }}><Text className="font-bold" style={{ color: ACCENT }}>{busy ? 'Opening...' : 'Open'}</Text></Pressable><Pressable disabled={busy || !data.fileUrl} onPress={download} className="mt-3 items-center rounded-2xl p-4" style={{ backgroundColor: ACCENT }}><Text className="font-bold text-white">{busy ? 'Downloading...' : 'Download material'}</Text></Pressable></View>}</ScrollView>;
}
