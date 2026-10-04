import dotenv from "dotenv"
import { defineConfig, env } from "prisma/config"

dotenv.config({ path: "../../.env" })

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