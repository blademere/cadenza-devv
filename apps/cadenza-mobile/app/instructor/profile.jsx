import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInstructorProfile, resetInstructorPassword, updateInstructorProfile } from '../../services/instructor.service';

const inputClass = 'mt-2 rounded-xl border border-gray-300 px-4 py-3 text-gray-900';

export default function InstructorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    getInstructorProfile()
      .then((data) => { setProfile(data); setDraft(data); })
      .catch((error) => setMessage(error?.message || 'Unable to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const updateDraft = (name, value) => setDraft((current) => ({ ...current, [name]: value }));
  const cancelEdit = () => { setDraft(profile); setEditing(false); };

  async function saveProfile() {
    try { setSaving(true); setMessage(''); const saved = await updateInstructorProfile(draft); setProfile({ ...profile, ...saved }); setDraft({ ...profile, ...saved }); setEditing(false); setMessage('Profile saved successfully.'); }
    catch (error) { setMessage(error?.response?.data?.message || error?.message || 'Unable to save profile.'); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    try { setSaving(true); setMessage(''); await resetInstructorPassword(passwords.currentPassword, passwords.newPassword); setPasswords({ currentPassword: '', newPassword: '' }); setMessage('Password reset successfully.'); }
    catch (error) { setMessage(error?.response?.data?.message || error?.message || 'Unable to reset password.'); }
    finally { setSaving(false); }
  }

  return <SafeAreaView className="flex-1 bg-[#F7F7FB]"><ScrollView contentContainerClassName="px-4 pb-8 pt-4"><Text className="mb-4 text-2xl font-bold text-[#0C447C]">My Profile</Text>{loading ? <ActivityIndicator color="#0C447C" /> : profile && <>
    <View className="rounded-2xl bg-white p-5"><View className="flex-row items-center justify-between"><Text className="text-lg font-bold text-gray-900">Saved profile</Text>{!editing && <Pressable onPress={() => setEditing(true)} className="rounded-xl border border-[#0C447C] px-4 py-2"><Text className="font-semibold text-[#0C447C]">Edit profile</Text></Pressable>}</View>
      {editing ? <>{[['firstName','First Name'],['middleName','Middle Name'],['lastName','Last Name'],['phone','Phone no.']].map(([name, label]) => <View key={name} className="mt-4"><Text className="text-sm font-semibold text-gray-700">{label}</Text><TextInput value={draft?.[name] || ''} onChangeText={(value) => updateDraft(name, value)} className={inputClass} /> </View>)}<Text className="mt-4 text-sm font-semibold text-gray-700">Email</Text><TextInput value={draft?.email || ''} editable={false} className="mt-2 rounded-xl bg-gray-100 px-4 py-3 text-gray-500" /><View className="mt-5 flex-row gap-3"><Pressable disabled={saving} onPress={cancelEdit} className="rounded-xl px-4 py-3"><Text className="font-semibold text-gray-600">Cancel</Text></Pressable><Pressable disabled={saving} onPress={saveProfile} className="rounded-xl bg-[#0C447C] px-5 py-3"><Text className="font-semibold text-white">{saving ? 'Saving...' : 'Save profile'}</Text></Pressable></View></> : <><Text className="mt-5 text-xl font-bold text-gray-900">{[profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ') || 'Instructor'}</Text><Text className="mt-2 text-gray-600">Email: {profile.email || 'Email not provided'}</Text><Text className="mt-1 text-gray-600">Phone: {profile.phone || 'Phone not provided'}</Text></>}
    </View>
    <View className="mt-5 rounded-2xl bg-white p-5"><Text className="text-lg font-bold text-gray-900">Reset password</Text><TextInput secureTextEntry placeholder="Current password" value={passwords.currentPassword} onChangeText={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))} className={inputClass} /><TextInput secureTextEntry placeholder="New password (8+ characters)" value={passwords.newPassword} onChangeText={(value) => setPasswords((current) => ({ ...current, newPassword: value }))} className={inputClass} /><Pressable disabled={saving || !passwords.currentPassword || passwords.newPassword.length < 8} onPress={changePassword} className="mt-4 rounded-xl border border-[#0C447C] px-4 py-3"><Text className="text-center font-semibold text-[#0C447C]">Reset password</Text></Pressable></View>
  </>}{!!message && <Text className="mt-4 text-sm text-gray-700">{message}</Text>}</ScrollView></SafeAreaView>;
}
