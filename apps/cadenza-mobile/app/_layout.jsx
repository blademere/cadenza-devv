import '../global.css';
import { Stack } from 'expo-router';
import { Appearance } from 'react-native';

Appearance.setColorScheme('light');
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
