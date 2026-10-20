import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  login,
  loginWithGoogleIdToken,
  MOCK_INSTRUCTOR_CREDENTIALS,
} from '../../services/authService';
import { API_BASE_URL } from '../../services/api';
import { saveAuth } from '../../services/authStorage';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

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

  return error?.message || 'Unable to log in. Please try again.';
}

function routeToDashboard(authData) {
  if (authData.account?.type === 'CLIENT') {
    router.replace('/student/dashboard');
    return true;
  }

  if (
    authData.account?.type === 'STAFF' ||
    authData.account?.type === 'INSTRUCTOR'
  ) {
    router.replace('/instructor/dashboard');
    return true;
  }

  return false;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [googleRequest, googleResponse, promptGoogleAsync] =
    Google.useIdTokenAuthRequest({
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
    });

  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === 'error') {
      setGoogleLoading(false);
      setErrorMessage(
        googleResponse.error?.message ||
          'Google sign-in was not completed. Please try again.',
      );
      return;
    }

    if (googleResponse.type !== 'success') {
      if (googleResponse.type === 'dismiss' || googleResponse.type === 'cancel') {
        setGoogleLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function finishGoogleSignIn() {
      const idToken =
        googleResponse.params?.id_token ||
        googleResponse.authentication?.idToken;

      try {
        setErrorMessage('');
        const authData = await loginWithGoogleIdToken(idToken);
        await saveAuth(authData);

        if (!routeToDashboard(authData)) {
          setErrorMessage(
            'This account cannot access the mobile application.',
          );
        }
      } catch (error) {
        console.error('Google sign-in error:', error);
        if (!cancelled) setErrorMessage(getLoginErrorMessage(error));
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    }

    finishGoogleSignIn();

    return () => {
      cancelled = true;
    };
  }, [googleResponse]);

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

      if (!routeToDashboard(authData)) {
        setErrorMessage('This account cannot access the mobile application.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMessage('');

    if (!GOOGLE_ANDROID_CLIENT_ID || !GOOGLE_IOS_CLIENT_ID || !GOOGLE_WEB_CLIENT_ID) {
      setErrorMessage(
        'Google sign-in is not configured yet. Add the Android, iOS, and Web OAuth client IDs to apps/cadenza-mobile/.env.',
      );
      return;
    }

    try {
      setGoogleLoading(true);
      await promptGoogleAsync();
    } catch (error) {
      setGoogleLoading(false);
      setErrorMessage(getLoginErrorMessage(error));
    }
  }

  const isLoading = loading || googleLoading;

  return (
    <View className="flex-1 justify-center bg-[#F8FAFC] px-6">
      <View className="mb-8">
        <Text className="text-4xl font-bold text-[#063970]">Cadenza</Text>
        <Text className="mt-2 text-base text-[#64748B]">
          Welcome back! Login to continue.
        </Text>
        {__DEV__ && (
          <View className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
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
          </View>
        )}
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

        <Button onPress={handleLogin} disabled={isLoading}>
          {loading ? 'Loading...' : 'Login'}
        </Button>

        <View className="my-1 flex-row items-center">
          <View className="h-px flex-1 bg-[#CBD5E1]" />
          <Text className="px-3 text-sm text-[#64748B]">OR</Text>
          <View className="h-px flex-1 bg-[#CBD5E1]" />
        </View>

        <Button
          onPress={handleGoogleLogin}
          disabled={isLoading || !googleRequest}
        >
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </Button>
      </View>
    </View>
  );
}
