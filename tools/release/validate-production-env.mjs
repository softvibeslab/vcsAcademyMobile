const required = [
  'VCSA_CORS_ORIGINS',
  'VCSA_DB_PATH',
  'VITE_API_BASE_URL',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_IOS_BUNDLE_IDENTIFIER',
  'EXPO_ANDROID_PACKAGE'
];

const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function fail(message) {
  console.error(`production env check failed: ${message}`);
  process.exitCode = 1;
}

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required`);
  return value || '';
}

function assertHttpsUrl(name, value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isPlaceholder = host === 'api.example.com' || host.endsWith('.example.com') || host.endsWith('.invalid');
    if (parsed.protocol !== 'https:' || localHosts.has(host) || isPlaceholder) {
      fail(`${name} must be a real HTTPS URL, received ${value}`);
    }
  } catch {
    fail(`${name} must be a valid URL, received ${value}`);
  }
}

function assertCorsOrigins(value) {
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!origins.length) fail('VCSA_CORS_ORIGINS must include at least one HTTPS origin');

  for (const origin of origins) {
    if (origin === '*') fail('VCSA_CORS_ORIGINS must not use wildcard origins in production');
    assertHttpsUrl('VCSA_CORS_ORIGINS', origin);
  }
}

function assertNativeId(name, value) {
  if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(value)) {
    fail(`${name} must look like a reverse-DNS identifier, received ${value}`);
  }
}

for (const name of required) requireValue(name);

assertCorsOrigins(process.env.VCSA_CORS_ORIGINS);
assertHttpsUrl('VITE_API_BASE_URL', process.env.VITE_API_BASE_URL);
assertHttpsUrl('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL);
assertNativeId('EXPO_IOS_BUNDLE_IDENTIFIER', process.env.EXPO_IOS_BUNDLE_IDENTIFIER);
assertNativeId('EXPO_ANDROID_PACKAGE', process.env.EXPO_ANDROID_PACKAGE);

if (!process.exitCode) console.log('production env check passed');
