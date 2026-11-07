import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { requestPasswordResetCode } from '../../services/authService';
import { API_BASE_URL } from '../../services/api';

function getRequestErrorMessage(error) {
  if (error?.response) {
    return (
      error.response.data?.message ||
      `The API rejected the password-reset request (HTTP ${error.response.status}).`
    );
  }

  if (error?.code === 'ECONNABORTED') {
    return `The API did not respond in time at ${API_BASE_URL}.`;
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response) {
    return `Cannot reach the API at ${API_BASE_URL}. Check your internet connection and try again.`;
  }

  return 'Unable to request a password reset. Please try again.';
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!email.trim() || loading) return;
    if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
      setError('Enter a valid gmail');
      setMessage('');
      return;
    }
    setLoading(true); setError(''); setMessage('');
    try {
      await requestPasswordResetCode(email.trim().toLowerCase());
      router.push({ pathname: '/verify-reset-code', params: { email: email.trim().toLowerCase() } });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || getRequestErrorMessage(requestError));
    } finally { setLoading(false); }
  }

  return <View className="flex-1 justify-center bg-white px-6"><Text className="text-3xl font-bold text-[#0C447C]">Forgot password?</Text><Text className="mt-3 leading-6 text-gray-600">Enter your Gmail address. We will send a 6-digit code.</Text><Input className="mt-6" placeholder="Gmail address" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" /><Button onPress={submit} disabled={loading || !email.trim()}>{loading ? 'Sending...' : 'Send code'}</Button>{message ? <Text className="mt-4 text-sm leading-5 text-green-700">{message}</Text> : null}{error ? <Text className="mt-4 text-sm leading-5 text-red-700">{error}</Text> : null}<Pressable onPress={() => router.replace('/login')} className="mt-6 items-center"><Text className="font-semibold text-[#0C447C]">Back to login</Text></Pressable></View>;
}
