const appJson = require('./app.json');

const releaseProfiles = new Set(['preview', 'production']);
const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function apiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
}

function assertReleaseApi(profile, value) {
  if (!releaseProfiles.has(profile)) return;
  if (!value) throw new Error('EXPO_PUBLIC_API_BASE_URL is required for preview and production EAS builds.');

  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  const isPlaceholder = host === 'api.example.com' || host.endsWith('.example.com');

  if (parsed.protocol !== 'https:' || localHosts.has(host) || isPlaceholder) {
    throw new Error(`Invalid EXPO_PUBLIC_API_BASE_URL for ${profile}: ${value}`);
  }
}

module.exports = ({ config }) => {
  const baseConfig = { ...appJson.expo, ...config };
  const buildProfile = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_APP_ENV || 'development';
  const resolvedApiBaseUrl = apiBaseUrl();

  assertReleaseApi(buildProfile, resolvedApiBaseUrl);

  return {
    ...baseConfig,
    name: process.env.EXPO_APP_NAME || baseConfig.name,
    slug: process.env.EXPO_APP_SLUG || baseConfig.slug,
    scheme: process.env.EXPO_APP_SCHEME || 'wl-sales-academy',
    version: process.env.EXPO_APP_VERSION || baseConfig.version,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER || 'com.whitelabel.salesacademy',
      buildNumber: process.env.EXPO_IOS_BUILD_NUMBER || '1',
      infoPlist: {
        ...baseConfig.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      ...baseConfig.android,
      package: process.env.EXPO_ANDROID_PACKAGE || 'com.whitelabel.salesacademy',
      versionCode: Number(process.env.EXPO_ANDROID_VERSION_CODE || 1)
    },
    extra: {
      ...baseConfig.extra,
      appEnv: process.env.EXPO_PUBLIC_APP_ENV || buildProfile,
      apiBaseUrl: resolvedApiBaseUrl,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      buildProfile
    }
  };
};
