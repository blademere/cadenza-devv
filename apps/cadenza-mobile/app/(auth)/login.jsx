import { Text, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { login, MOCK_INSTRUCTOR_CREDENTIALS } from '../../services/authService';
import { API_BASE_URL } from '../../services/api';
import { saveAuth } from '../../services/authStorage';

function getLoginErrorMessage(error) {
  if (error?.response) {
    return (
      error.response.data?.message ||
      `The API rejected the login request (HTTP ${error.response.status}).`
    );
  }

  if (error?.code === 'ECONNABORTED') {
    return `The API did not respond in time at ${API_BASE_URL}.`;
  }

  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return `Cannot reach the API at ${API_BASE_URL}. Check that it is running and that this address is reachable from your device.`;
  }

  return 'Unable to log in. Please try again.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      const authData = await login(email.trim(), password);
      await saveAuth(authData);

      if (authData.account?.type === 'CLIENT') {
        router.replace('/student/dashboard');
        return;
      }

      if (authData.account?.type === 'STAFF') {
        router.replace('/instructor/dashboard');
        return;
      }

      setErrorMessage('This account cannot access the mobile application.');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center bg-[#F8FAFC] px-6">
      <View className="mb-8">
        <Text className="text-4xl font-bold text-[#063970]">Cadenza</Text>
        <Text className="mt-2 text-base text-[#64748B]">
          Welcome back! Login to continue.
        </Text>
        {__DEV__ && <View className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <Text className="font-semibold text-blue-900">
            Local instructor demo account
          </Text>
          <Text className="mt-1 text-sm text-blue-800">
            Email: {MOCK_INSTRUCTOR_CREDENTIALS.email}
          </Text>
          <Text className="text-sm text-blue-800">
            Password: {MOCK_INSTRUCTOR_CREDENTIALS.password}
          </Text>
          <Text className="mt-1 text-xs text-blue-700">
            This account is for mobile UI testing only. It is not a backend
            account.
          </Text>
        </View>}
      </View>

      {errorMessage ? (
        <View className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="font-semibold text-red-700">Login Failed</Text>
          <Text className="mt-1 text-sm text-red-600">{errorMessage}</Text>
        </View>
      ) : null}

      <View className="gap-4">
        <Input
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMessage('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <View>
          <View className="mb-2 flex-row justify-between px-1">
            <Text className="text-sm font-medium text-[#334155]">Password</Text>
          </View>

          <Input
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMessage('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Button onPress={handleLogin} disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </Button>
      </View>
    </View>
  );
}
