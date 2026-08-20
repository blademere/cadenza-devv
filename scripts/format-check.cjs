const { execFileSync } = require('node:child_process')

const args = ['--check', '.']

try {
  execFileSync('npx', ['--no-install', 'prettier', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
} catch (error) {
  process.exit(error.status ?? 1)
}
