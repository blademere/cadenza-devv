const { beforeEach, describe, expect, it, vi } = require('vitest');

vi.mock('../../../config', () => ({
  env: {
    OAUTH_STATE_TTL_SECONDS: 600,
    OAUTH_GOOGLE_CLIENT_ID: 'google-client',
    OAUTH_GOOGLE_CLIENT_SECRET: 'google-secret',
    OAUTH_GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
    OAUTH_GITHUB_CLIENT_ID: 'github-client',
    OAUTH_GITHUB_CLIENT_SECRET: 'github-secret',
    OAUTH_GITHUB_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/oauth/github/callback',
  },
}));

const {
  createOAuthState,
  createAuthorizationUrl,
  safeEqual,
  getProviderConfig,
} = require('./oauth.providers');

describe('OAuth providers', () => {
  it('creates an opaque cryptographically random state', () => {
    const state = createOAuthState();

    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThanOrEqual(40);
    expect(createOAuthState()).not.toBe(state);
  });

  it('creates a Google authorization URL with the supplied state', () => {
    const url = createAuthorizationUrl('google', 'state-123');
    const parsed = new URL(url);

    expect(parsed.hostname).toBe('accounts.google.com');
    expect(parsed.searchParams.get('state')).toBe('state-123');
    expect(parsed.searchParams.get('client_id')).toBe('google-client');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/v1/auth/oauth/google/callback',
    );
    expect(parsed.searchParams.get('response_type')).toBe('code');
  });

  it('creates a GitHub authorization URL with the supplied state', () => {
    const url = createAuthorizationUrl('github', 'state-456');
    const parsed = new URL(url);

    expect(parsed.hostname).toBe('github.com');
    expect(parsed.searchParams.get('state')).toBe('state-456');
    expect(parsed.searchParams.get('client_id')).toBe('github-client');
  });

  it('returns provider configuration for supported providers', () => {
    expect(getProviderConfig('google')).toMatchObject({
      clientId: 'google-client',
      clientSecret: 'google-secret',
    });
    expect(getProviderConfig('github')).toMatchObject({
      clientId: 'github-client',
      clientSecret: 'github-secret',
    });
  });

  it('rejects unsupported providers', () => {
    expect(() => getProviderConfig('facebook')).toThrow();
    expect(() => createAuthorizationUrl('facebook', 'state')).toThrow();
  });

  describe('safeEqual', () => {
    it('returns true for equal values', () => {
      expect(safeEqual('same-state', 'same-state')).toBe(true);
    });

    it('returns false for different values', () => {
      expect(safeEqual('state-a', 'state-b')).toBe(false);
    });

    it('returns false when a value is missing', () => {
      expect(safeEqual(undefined, 'state')).toBe(false);
      expect(safeEqual('state', undefined)).toBe(false);
      expect(safeEqual('', 'state')).toBe(false);
    });
  });
});
