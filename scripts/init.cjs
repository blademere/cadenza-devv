#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const readline = require('node:readline/promises')
const { stdin, stdout } = require('node:process')

const root = path.resolve(__dirname, '..')
const packagePath = path.join(root, 'package.json')
const envExamplePath = path.join(root, '.env.example')
const envPath = path.join(root, '.env')

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-') || 'express-app'
}

function databaseName(value) {
  return slugify(value).replace(/-/g, '_')
}

function randomSecret() {
  return crypto.randomBytes(32).toString('base64url')
}

function replaceEnvValue(env, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}=${value}`
  return pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`
}

function isValidPackageName(value) {
  return /^(?:@[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*|[a-z0-9][a-z0-9._~-]*)$/.test(value)
}

function isValidDatabaseName(value) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)
}

function isValidPort(value) {
  if (!/^\d+$/.test(value)) return false
  const port = Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

async function askRequired(rl, question, defaultValue, validator = () => true) {
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : ''
    const answer = (await rl.question(`${question}${suffix}: `)).trim() || defaultValue
    if (validator(answer)) return answer
    console.log('Invalid value. Please try again.')
  }
}

async function main() {
  if (!fs.existsSync(packagePath) || !fs.existsSync(envExamplePath)) {
    throw new Error('Run this command from the project root; package.json or .env.example is missing.')
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const existingEnv = fs.existsSync(envPath)
  const rl = readline.createInterface({ input: stdin, output: stdout })

  try {
    console.log('\nInitialize a new project from your Express foundation.\n')

    const projectName = await askRequired(rl, 'Project name', process.env.APP_NAME || 'Express App')
    const appSlug = slugify(projectName)
    const defaultPackageName = pkg.name === 'express-app' ? appSlug : pkg.name
    const packageName = await askRequired(rl, 'Package name', defaultPackageName, isValidPackageName)
    const dbName = await askRequired(rl, 'Database name', databaseName(projectName), isValidDatabaseName)
    const port = await askRequired(rl, 'Port', process.env.PORT || '3000', isValidPort)

    pkg.name = packageName
    pkg.description = `${projectName} API`
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)

    if (existingEnv) {
      console.log('\n.env already exists; leaving it unchanged.')
    } else {
      let env = fs.readFileSync(envExamplePath, 'utf8')
      env = replaceEnvValue(env, 'APP_NAME', projectName)
      env = replaceEnvValue(env, 'APP_SLUG', appSlug)
      env = replaceEnvValue(env, 'PORT', port)
      env = replaceEnvValue(env, 'DATABASE_URL', `postgresql://user:password@localhost:5432/${dbName}?schema=public`)
      env = replaceEnvValue(env, 'JWT_ACCESS_SECRET', randomSecret())
      env = replaceEnvValue(env, 'JWT_REFRESH_SECRET', randomSecret())
      env = replaceEnvValue(env, 'METRICS_TOKEN', randomSecret())
      fs.writeFileSync(envPath, env)
    }

    console.log('\nProject initialized successfully.')
    console.log(`  Name:     ${projectName}`)
    console.log(`  Slug:     ${appSlug}`)
    console.log(`  Package:  ${packageName}`)
    console.log(`  Database: ${dbName}`)
    console.log(`  Port:     ${port}`)
    console.log('\nNext steps:')
    console.log('  npm install')
    console.log('  npm run db:setup')
    console.log('  npm run dev')
  } finally {
    rl.close()
  }
}

main().catch((error) => {
  console.error(`\nInitialization failed: ${error.message}`)
  process.exit(1)
})
