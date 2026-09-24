import "dotenv/config"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node scripts/db-seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
