import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useEffect } from 'react';

import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { login, loginWithGoogle, logout, MOCK_INSTRUCTOR_CREDENTIALS } from '../../services/authService';
import { API_BASE_URL } from '../../services/api';
import { saveAuth } from '../../services/authStorage';

WebBrowser.maybeCompleteAuthSession();

function getLoginErrorMessage(error) {
  if (error?.response) {
    if (error.response.status === 401) return 'Invalid credentials.';
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

function getHomeRoute(account) {
  if (account?.type === 'CLIENT') return '/student/dashboard';
  if (account?.type === 'INSTRUCTOR') return '/instructor/dashboard';
  if (account?.type === 'STAFF' && String(account.staffType || '').toUpperCase() === 'INSTRUCTOR') return '/instructor/dashboard';
  return null;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const googleClientIds = Constants.expoConfig?.extra ?? {};
  const googleNativeScheme = googleClientIds.googleAndroidClientId
    ? `com.googleusercontent.apps.${googleClientIds.googleAndroidClientId.split('.')[0]}`
    : 'mobile';
  const googleRedirectUri = makeRedirectUri({
    native: `${googleNativeScheme}:/oauthredirect`,
    scheme: googleNativeScheme,
    path: 'oauthredirect',
  });
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleClientIds.googleAndroidClientId,
    iosClientId: googleClientIds.googleIosClientId,
    webClientId: Platform.OS === 'web' ? googleClientIds.googleWebClientId : undefined,
    redirectUri: googleRedirectUri,
  });

  useEffect(() => {
    if (response?.type !== 'success' || !response.authentication?.accessToken) return;
    (async () => {
      try {
        setLoading(true);
        await logout();
        const authData = await loginWithGoogle(response.authentication.accessToken);
        await saveAuth(authData);
        const homeRoute = getHomeRoute(authData.account);
        if (!homeRoute) throw new Error('This account cannot access the mobile application.');
        router.replace(homeRoute);
      } catch (error) {
        setErrorMessage(getLoginErrorMessage(error));
      } finally { setLoading(false); }
    })();
  }, [response]);

  async function handleLogin() {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      await logout();
      const authData = await login(email.trim(), password);
      await saveAuth(authData);
      const homeRoute = getHomeRoute(authData.account);
      if (!homeRoute) {
        await logout();
        setErrorMessage('This account cannot access the mobile application.');
        return;
      }
      router.replace(homeRoute);
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
        <Button onPress={() => promptAsync()} disabled={!request || loading} variant="outline">
          Login with Google
        </Button>
        <Pressable onPress={() => router.push('/forgot-password')} disabled={loading} className="items-center py-1">
          <Text className="font-semibold text-[#0C447C]">Forgot password?</Text>
        </Pressable>
      </View>
    </View>
  );
}
