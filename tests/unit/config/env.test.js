import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"

const envModulePath = require.resolve("../../../src/config/env")

function runEnvModule(overrides = {}) {
  const result = spawnSync(process.execPath, ["-e", `require(${JSON.stringify(envModulePath)})`], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...overrides,
    },
  })

  return result
}

describe("environment configuration", () => {
  it("loads the validated configuration with normalized values", async () => {
    const { default: env } = await import("../../../src/config/env.js")

    expect(env.PORT).toBeTypeOf("number")
    expect(env.COOKIE_SECURE).toBeTypeOf("boolean")
    expect(env.COOKIE_REFRESH_MAX_AGE_MS).toBeTypeOf("number")
    expect(env.APP_SLUG).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(["local"]).toContain(env.STORAGE_PROVIDER)
    expect(env.STORAGE_LOCAL_ROOT).toBeTypeOf("string")
  })

  it("fails fast when required database configuration is missing", () => {
    const result = runEnvModule({
      DATABASE_URL: "",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
    })

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain("DATABASE_URL")
  })

  it("fails fast for insecure production cookie configuration", () => {
    const result = runEnvModule({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:password@localhost:5432/express_app",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      COOKIE_SECURE: "false",
      COOKIE_SAME_SITE: "lax",
      METRICS_TOKEN: "m".repeat(32),
      COOKIE_REFRESH_MAX_AGE_MS: "604800000",
      JWT_REFRESH_EXPIRES_IN: "7d",
    })

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain("COOKIE_SECURE")
  })

  it("fails fast when OAuth credentials are only partially configured", () => {
    const result = runEnvModule({
      DATABASE_URL: "postgresql://user:password@localhost:5432/express_app",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      OAUTH_GOOGLE_CLIENT_ID: "client-id",
      OAUTH_GOOGLE_CLIENT_SECRET: "",
      OAUTH_GOOGLE_CALLBACK_URL: "",
    })

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain("Google OAuth")
  })
})
