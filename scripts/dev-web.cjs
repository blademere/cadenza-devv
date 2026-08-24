#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const command = process.argv[2] ?? 'start'
const pidFile = path.join(process.cwd(), '.vite-dev.pid')

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function removePidFile() {
  try {
    fs.unlinkSync(pidFile)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

function readPid() {
  try {
    return Number.parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function stopProcess(pid) {
  if (!pid || !Number.isInteger(pid)) return

  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'inherit',
      windowsHide: true,
    }).on('close', () => removePidFile())
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }

  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
    removePidFile()
  }, 1000).unref()
}

if (command === 'stop') {
  stopProcess(readPid())
  process.exit(0)
}

if (command !== 'start') {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}

const existingPid = readPid()
if (existingPid) stopProcess(existingPid)

const child = spawn(
  npmCommand(),
  ['--workspace', '@express-app/web', 'run', 'dev'],
  {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    stdio: 'inherit',
    windowsHide: false,
  },
)

fs.writeFileSync(pidFile, `${child.pid}\n`, 'utf8')

function shutdown(signal) {
  stopProcess(child.pid)
  if (signal) process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

child.on('exit', (code, signal) => {
  removePidFile()

  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
