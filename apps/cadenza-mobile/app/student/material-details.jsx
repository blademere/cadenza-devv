import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import useMobileResource from '../../hooks/useMobileResource';
import { getStudentMaterial } from '../../services/studentService';
import { ResourceFeedback } from '../../components/common/ResourceFeedback';
import { API_BASE_URL } from '../../services/api';
import { getToken } from '../../services/authStorage';

const ACCENT = '#0C447C';

export default function StudentMaterialDetails() {
  const params = useLocalSearchParams();
  const materialId = Array.isArray(params.materialId) ? params.materialId[0] : params.materialId;
  const loadMaterial = useCallback(() => getStudentMaterial(materialId), [materialId]);
  const { data, loading, error, refresh } = useMobileResource(loadMaterial);
  const [localUri, setLocalUri] = useState(null);
  const [busy, setBusy] = useState(false);
  const isImage = /^image\//i.test(data?.type || '');
  const isPdf = data?.type === 'application/pdf' || /\.pdf$/i.test(data?.title || '');

  async function fetchMaterial() {
    if (!data?.fileUrl) throw new Error('This material has no uploaded file.');
    const token = await getToken();
    if (!token) throw new Error('Please sign in again to access this material.');
    const extension = (data.title || '').match(/\.[a-z0-9]{1,8}$/i)?.[0] || (isPdf ? '.pdf' : isImage ? '.jpg' : '.bin');
    const target = FileSystem.cacheDirectory + 'cadenza-material-' + encodeURIComponent(String(materialId)) + extension;
    const response = await FileSystem.downloadAsync(`${API_BASE_URL}/student/materials/${encodeURIComponent(String(materialId))}/file`, target, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status !== 200) throw new Error(`Unable to load file (HTTP ${response.status}).`);
    setLocalUri(response.uri);
    return response.uri;
  }

  async function openMaterial() {
    if (busy) return;
    setBusy(true);
    try {
      const uri = localUri || await fetchMaterial();
      if (isImage) return;
      if (isPdf) {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: 'application/pdf' });
        return;
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: data?.type || 'application/octet-stream' });
      else Alert.alert('Preview unavailable', 'A compatible viewer is not installed. You can still download the file.');
    } catch (e) {
      Alert.alert('Unable to open file', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadMaterial() {
    if (busy) return;
    setBusy(true);
    try {
      const uri = localUri || await fetchMaterial();
      const name = (data?.title || 'Learning material').replace(/[\\/]/g, '_');
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) return;
      const bytes = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const destination = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, name, data?.type || 'application/octet-stream');
      await FileSystem.writeAsStringAsync(destination, bytes, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('Download complete', 'The material has been saved to your chosen folder.');
    } catch (e) {
      Alert.alert('Download failed', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <Text className="text-2xl font-bold" style={{ color: ACCENT }}>Material Details</Text>
      <ResourceFeedback loading={loading} error={error} onRetry={refresh} />
      {data && <View className="mt-6 rounded-3xl border border-gray-200 p-5">
        <Text className="text-xl font-bold text-gray-800">{data.title}</Text>
        <Text className="mt-3 leading-6 text-gray-600">{data.description}</Text>
        <Text className="mt-5 text-sm text-gray-600">Type: {data.type}</Text>
        <Text className="mt-1 text-sm text-gray-600">Instructor: {data.instructor?.name || 'Pending'}</Text>
        <Text className="mt-1 text-sm text-gray-600">Status: {data.status}</Text>
        <Text className="mt-1 text-sm text-gray-600">Uploaded: {data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString() : 'Pending'}</Text>
        {isImage && localUri && <Image source={{ uri: localUri }} resizeMode="contain" style={{ width: '100%', height: 350, marginTop: 20, backgroundColor: '#F1F5F9' }} />}
        <Pressable disabled={busy} onPress={openMaterial} className="mt-6 items-center rounded-2xl p-4" style={{ backgroundColor: ACCENT }}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-bold text-white">Open Material</Text>}
        </Pressable>
        <Pressable disabled={busy} onPress={downloadMaterial} className="mt-3 items-center rounded-2xl border p-4" style={{ borderColor: ACCENT }}>
          <Text style={{ color: ACCENT, fontWeight: '700' }}>Download</Text>
        </Pressable>
      </View>}
    </ScrollView>
  );
}
