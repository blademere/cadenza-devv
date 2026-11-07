// This route exists so Expo Router does not report an "Unmatched Route" when
// Google returns to the native OAuth callback URI. expo-auth-session consumes
// the callback through its response listener in the login screen.
export default function OAuthRedirect() {
  return null;
}
