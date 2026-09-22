#!/usr/bin/env node

import 'dotenv/config'

import { runSeed } from './seed/index.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const prisma = getPrismaClient()

async function main() {
  const profile = process.argv[2]?.startsWith('--profile=')
    ? process.argv[2].slice('--profile='.length)
    : 'default'

  await runSeed(prisma, profile)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
