const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = ({ config }) => ({
  ...config,
  // Native Google OAuth requires the reverse client-id scheme. Using the
  // generic `mobile` scheme produces `mobile://oauthredirect`, which Google
  // rejects for an Android OAuth client.
  scheme: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    ? `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.split('.')[0]}`
    : config.scheme,
  extra: {
    ...config.extra,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
});
