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
