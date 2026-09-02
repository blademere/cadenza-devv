import { describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-key-minimum-32-characters';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-minimum-32-characters';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.COOKIE_REFRESH_MAX_AGE_MS = process.env.COOKIE_REFRESH_MAX_AGE_MS || '604800000';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.OAUTH_GOOGLE_CLIENT_ID = 'google-client';
process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'google-secret';
process.env.OAUTH_GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/oauth/google/callback';
process.env.OAUTH_FACEBOOK_CLIENT_ID = 'facebook-client';
process.env.OAUTH_FACEBOOK_CLIENT_SECRET = 'facebook-secret';
process.env.OAUTH_FACEBOOK_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/oauth/facebook/callback';
process.env.OAUTH_FACEBOOK_API_VERSION = 'v24.0';

const {
  createState,
  createPkceVerifier,
  createPkceChallenge,
  createAuthorizationUrl,
  safeEqual,
  getProviderConfig,
} = require('../../../../src/features/auth/oauth/oauth.providers');

describe('OAuth providers', () => {
  it('creates an opaque cryptographically random state', () => {
    const state = createState();
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThanOrEqual(40);
    expect(createState()).not.toBe(state);
  });

  it('creates a cryptographically random PKCE verifier and deterministic S256 challenge', () => {
    const verifier = createPkceVerifier();
    const challenge = createPkceChallenge(verifier);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(createPkceChallenge(verifier)).toBe(challenge);
    expect(createPkceChallenge(createPkceVerifier())).not.toBe(challenge);
  });

  it('creates a Google authorization URL with state and S256 PKCE', () => {
    const verifier = createPkceVerifier();
    const challenge = createPkceChallenge(verifier);
    const parsed = new URL(createAuthorizationUrl('google', 'state-123', challenge));
    expect(parsed.hostname).toBe('accounts.google.com');
    expect(parsed.searchParams.get('state')).toBe('state-123');
    expect(parsed.searchParams.get('client_id')).toBe('google-client');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/v1/auth/oauth/google/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('code_challenge')).toBe(challenge);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('creates a Facebook authorization URL with state and S256 PKCE', () => {
    const verifier = createPkceVerifier();
    const challenge = createPkceChallenge(verifier);
    const parsed = new URL(createAuthorizationUrl('facebook', 'state-456', challenge));
    expect(parsed.hostname).toBe('www.facebook.com');
    expect(parsed.pathname).toBe('/v24.0/dialog/oauth');
    expect(parsed.searchParams.get('state')).toBe('state-456');
    expect(parsed.searchParams.get('client_id')).toBe('facebook-client');
    expect(parsed.searchParams.get('scope')).toBe('email');
    expect(parsed.searchParams.get('code_challenge')).toBe(challenge);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('returns provider configuration for supported providers', () => {
    expect(getProviderConfig('google')).toMatchObject({ clientId: 'google-client', clientSecret: 'google-secret' });
    expect(getProviderConfig('facebook')).toMatchObject({ clientId: 'facebook-client', clientSecret: 'facebook-secret' });
  });

  it('rejects unsupported providers', () => {
    expect(() => getProviderConfig('github')).toThrow();
    expect(() => createAuthorizationUrl('github', 'state', 'challenge')).toThrow();
  });

  describe('safeEqual', () => {
    it('returns true for equal values', () => expect(safeEqual('same-state', 'same-state')).toBe(true));
    it('returns false for different values', () => expect(safeEqual('state-a', 'state-b')).toBe(false));
    it('returns false when a value is missing', () => {
      expect(safeEqual(undefined, 'state')).toBe(false);
      expect(safeEqual('state', undefined)).toBe(false);
      expect(safeEqual('', 'state')).toBe(false);
    });
  });
});
