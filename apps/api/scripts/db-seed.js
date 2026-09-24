#!/usr/bin/env node

import 'dotenv/config'

import { runSeed } from './seed/index.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const prisma = getPrismaClient()

function readOption(name, fallback) {
  const prefix = `--${name}=`
  const argument = process.argv.find((value) => value.startsWith(prefix))
  return argument ? argument.slice(prefix.length) : fallback
}

async function main() {
  const profile = readOption('profile', 'default')
  const app = readOption('app', 'platform')
  await runSeed(prisma, profile, app)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
