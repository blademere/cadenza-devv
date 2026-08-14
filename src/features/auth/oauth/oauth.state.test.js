import { beforeEach, describe, expect, it, vi } from 'vitest';

const redis = {
  set: vi.fn(),
  getDel: vi.fn(),
};

// oauth.providers.js is CommonJS and loads its Redis dependency with require().
// Vitest's vi.mock() does not reliably replace that CommonJS require path in
// this setup, so patch the real module export before dynamically importing the
// provider module. This keeps the production Redis implementation unchanged
// while ensuring these unit tests never connect to localhost:6379.
const redisModule = require('../../../infrastructure/cache/redis');
redisModule.connectRedis = vi.fn(async () => redis);

vi.mock('../../../config', () => ({
  env: {
    OAUTH_GOOGLE_CLIENT_ID: 'google-client',
    OAUTH_GOOGLE_CLIENT_SECRET: 'google-secret',
    OAUTH_GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
    OAUTH_GITHUB_CLIENT_ID: 'github-client',
    OAUTH_GITHUB_CLIENT_SECRET: 'github-secret',
    OAUTH_GITHUB_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/oauth/github/callback',
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax',
    COOKIE_DOMAIN: '',
  },
}));

// Import after the Redis module has been patched because oauth.providers.js is
// CommonJS and captures connectRedis during module evaluation.
const { consumeOAuthState, storeOAuthState } = await import('./oauth.providers.js');

const validState = 'a'.repeat(43);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OAuth state storage', () => {
  it('stores login state atomically with NX and EX', async () => {
    redis.set.mockResolvedValue('OK');

    await storeOAuthState(validState, {
      flow: 'login',
      provider: 'google',
    }, 600000);

    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^oauth:state:[a-f0-9]{64}$/),
      JSON.stringify({ flow: 'login', provider: 'google' }),
      { NX: true, EX: 600 },
    );
  });

  it('stores link state with a normalized numeric user id', async () => {
    redis.set.mockResolvedValue('OK');

    await storeOAuthState(validState, {
      flow: 'link',
      provider: 'github',
      userId: '42',
    }, 30000);

    expect(redis.set).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ flow: 'link', provider: 'github', userId: 42 }),
      { NX: true, EX: 30 },
    );
  });

  it('rejects invalid state input', async () => {
    await expect(
      storeOAuthState('short', { flow: 'login', provider: 'google' }, 600000),
    ).rejects.toThrow('OAuth state must be a high-entropy string.');

    expect(redis.set).not.toHaveBeenCalled();
  });

  it('rejects invalid flow and provider metadata', async () => {
    await expect(
      storeOAuthState(validState, { flow: 'unknown', provider: 'google' }, 600000),
    ).rejects.toThrow('Invalid OAuth state flow.');

    await expect(
      storeOAuthState(validState, { flow: 'login', provider: 'facebook' }, 600000),
    ).rejects.toThrow('Invalid OAuth state provider.');
  });

  it('requires a valid user id for link state', async () => {
    await expect(
      storeOAuthState(validState, { flow: 'link', provider: 'google' }, 600000),
    ).rejects.toThrow('A valid userId is required for OAuth linking.');
  });

  it('rejects state collisions', async () => {
    redis.set.mockResolvedValue(null);

    await expect(
      storeOAuthState(validState, { flow: 'login', provider: 'google' }, 600000),
    ).rejects.toThrow('OAuth state collision detected.');
  });
});

describe('OAuth state consumption', () => {
  it('atomically consumes a valid login state', async () => {
    redis.getDel.mockResolvedValue(
      JSON.stringify({ flow: 'login', provider: 'google' }),
    );

    await expect(
      consumeOAuthState(validState, 'login', 'google'),
    ).resolves.toEqual({ flow: 'login', provider: 'google' });

    expect(redis.getDel).toHaveBeenCalledWith(
      expect.stringMatching(/^oauth:state:[a-f0-9]{64}$/),
    );
  });

  it('atomically consumes a valid link state', async () => {
    redis.getDel.mockResolvedValue(
      JSON.stringify({ flow: 'link', provider: 'github', userId: 42 }),
    );

    await expect(
      consumeOAuthState(validState, 'link', 'github'),
    ).resolves.toEqual({ flow: 'link', provider: 'github', userId: 42 });
  });

  it('rejects a missing or expired state', async () => {
    redis.getDel.mockResolvedValue(null);

    await expect(
      consumeOAuthState(validState, 'login', 'google'),
    ).resolves.toBeNull();
  });

  it('rejects a state used for the wrong flow', async () => {
    redis.getDel.mockResolvedValue(
      JSON.stringify({ flow: 'login', provider: 'google' }),
    );

    await expect(
      consumeOAuthState(validState, 'link', 'google'),
    ).resolves.toBeNull();
  });

  it('rejects a state used for the wrong provider', async () => {
    redis.getDel.mockResolvedValue(
      JSON.stringify({ flow: 'login', provider: 'google' }),
    );

    await expect(
      consumeOAuthState(validState, 'login', 'github'),
    ).resolves.toBeNull();
  });

  it('rejects malformed stored metadata', async () => {
    redis.getDel.mockResolvedValue('{not-json');

    await expect(
      consumeOAuthState(validState, 'login', 'google'),
    ).resolves.toBeNull();
  });

  it('rejects invalid stored link user ids', async () => {
    redis.getDel.mockResolvedValue(
      JSON.stringify({ flow: 'link', provider: 'google', userId: 0 }),
    );

    await expect(
      consumeOAuthState(validState, 'link', 'google'),
    ).resolves.toBeNull();
  });

  it('rejects invalid expected flow and provider before Redis access', async () => {
    await expect(
      consumeOAuthState(validState, 'invalid', 'google'),
    ).rejects.toThrow('Invalid expected OAuth state flow.');

    await expect(
      consumeOAuthState(validState, 'login', 'facebook'),
    ).rejects.toThrow('Invalid expected OAuth state provider.');

    expect(redis.getDel).not.toHaveBeenCalled();
  });

  it('does not consume short or invalid states', async () => {
    await expect(consumeOAuthState('short', 'login', 'google')).resolves.toBeNull();
    expect(redis.getDel).not.toHaveBeenCalled();
  });
});
