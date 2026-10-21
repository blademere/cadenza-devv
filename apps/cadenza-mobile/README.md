# Cadenza Mobile

Expo / React Native client for Cadenza, managed as part of the repository npm workspace.

## Requirements

- Node.js and npm versions supported by the repository root
- Expo Go for local development, or an EAS development/production build for release testing
- A reachable Cadenza API for live authentication and data

## Install and run

Run commands from the repository root so npm resolves the monorepo workspaces consistently:

```bash
npm install
cp apps/cadenza-mobile/.env.example apps/cadenza-mobile/.env
npx expo start --project-dir apps/cadenza-mobile
```

Scan the QR code with Expo Go. A physical phone cannot use `localhost` to reach an API running on your computer; use the computer's LAN IP for local testing or a deployed HTTPS API.

## API configuration

Set `EXPO_PUBLIC_MOBILE_API_URL` to the API base URL expected by the mobile services. Verify that the corresponding mobile routes exist on the deployed backend and are covered by integration tests before switching `EXPO_PUBLIC_MOBILE_DATA_MODE` to `live`.

- `mock` is for local development only.
- Never put private API keys, database credentials, OAuth client secrets, or other server secrets in an `EXPO_PUBLIC_*` variable. Expo embeds these values in the client bundle.
- Use HTTPS for remote environments.
- Test login, token expiry, logout, authorization failures, offline behavior, and server errors on a physical device before release.

## Google sign-in (development build)

Google sign-in uses an ID token obtained by the native Google OAuth flow and verified by the API. It does not create accounts or link Google identities. Only an existing active Cadenza client with an approved enrollment or an active registered instructor can sign in.

1. In Google Cloud Console, select the existing project and configure OAuth consent screen / audience.
2. Create or reuse OAuth client IDs for the Android application ID and iOS bundle ID configured in `app.json`, plus a Web application client ID.
3. Put the three public client IDs in `apps/cadenza-mobile/.env` as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Client IDs are public; never add a client secret to the mobile app.
4. Configure the API environment variable `OAUTH_GOOGLE_MOBILE_CLIENT_IDS` as a comma-separated list of the accepted mobile OAuth audience IDs (Android, iOS, and Web IDs). Restart/redeploy the API after changing it.
5. Use an EAS development build for native-device testing. Expo Go is not a substitute for verifying native OAuth behavior. Ensure the package/bundle IDs and signing SHA-1 fingerprints in Google Cloud match the build being tested.

The existing web OAuth variables `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, and `OAUTH_GOOGLE_CALLBACK_URL` remain for web OAuth; the mobile endpoint uses the separate audience allowlist above.

## EAS builds

Authenticate with the Expo account that owns this app, then create/configure the EAS project:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Confirm that the iOS bundle identifier and Android application ID in `app.json` are available to your organization and match any existing store registrations. Configure EAS project identifiers and store signing credentials through EAS; never commit signing keys or service credentials.

## Release checklist

- [ ] Verify production API base URL and mobile endpoint contracts.
- [ ] Confirm live mode is enabled only in release environments.
- [ ] Validate authentication and authorization against the deployed backend.
- [ ] Test token expiry, logout, and secure token persistence.
- [ ] Test on physical iOS and Android devices.
- [ ] Review app icon, splash artwork, store metadata, privacy policy, and data disclosures.
- [ ] Run lint/type checks and a release build; resolve all warnings and errors.
- [ ] Verify crash reporting, privacy-safe logs, and release rollback process.

Expo Go is useful for development but is not a substitute for testing a production build.
