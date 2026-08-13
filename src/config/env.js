const dotenv = require("dotenv")
const { z } = require("zod")

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters."),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters."),

  JWT_ACCESS_EXPIRES_IN: z.string().min(2).default("15m"),

  JWT_REFRESH_EXPIRES_IN: z.string().min(2).default("7d"),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),

  COOKIE_DOMAIN: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ")

  throw new Error(`Invalid environment configuration. ${details}`)
}

if (parsed.data.COOKIE_SAME_SITE === "none" && !parsed.data.COOKIE_SECURE) {
  throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is 'none'.")
}

module.exports = Object.freeze(parsed.data)
