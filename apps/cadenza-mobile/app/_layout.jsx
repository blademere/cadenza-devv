import '../global.css';
import { Stack } from 'expo-router';
import { Appearance } from 'react-native';

// React Native Web and some Expo runtimes do not expose setColorScheme.
// Keep the light theme where the API exists without crashing startup elsewhere.
Appearance.setColorScheme?.('light');
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
