import '../global.css';
import { Stack } from 'expo-router';
import { AppState, Appearance } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { getLastActivityAt, logout, touchActivity } from '../services/authStorage';

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000;

// React Native Web and some Expo runtimes do not expose setColorScheme.
// Keep the light theme where the API exists without crashing startup elsewhere.
Appearance.setColorScheme?.('light');
export default function RootLayout() {
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        await touchActivity();
      }
      if (previousState !== 'active' && nextState === 'active') {
        const lastActivityAt = await getLastActivityAt();
        if (lastActivityAt && Date.now() - lastActivityAt >= INACTIVITY_LIMIT_MS) {
          await logout();
          router.replace('/login?reason=inactive');
        }
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
