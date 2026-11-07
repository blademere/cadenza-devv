import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { verifyPasswordResetCode } from '../../services/authService';

export default function VerifyResetCode() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (code.length !== 6 || loading) return;
    try {
      setLoading(true);
      setError('');
      const result = await verifyPasswordResetCode(String(email), code);
      router.replace({
        pathname: '/update-password',
        params: { token: result.resetToken },
      });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'The code is invalid or expired.',
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-[#0C447C]">Enter code</Text>
      <Text className="mt-3 leading-6 text-gray-600">
        Check your email for your 6-digit reset code.
      </Text>
      <Input
        className="mt-6"
        placeholder="6-digit code"
        value={code}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, '').slice(0, 6));
          setError('');
        }}
        keyboardType="number-pad"
      />
      <Button onPress={submit} disabled={loading || code.length !== 6}>
        {loading ? 'Checking...' : 'Verify code'}
      </Button>
      {error ? (
        <Text className="mt-4 text-sm text-red-700">{error}</Text>
      ) : null}
      <Pressable
        onPress={() => router.replace('/login')}
        className="mt-6 items-center"
      >
        <Text className="font-semibold text-[#0C447C]">Back to login</Text>
      </Pressable>
    </View>
  );
}
