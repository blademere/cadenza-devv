const { spawnSync } = require('node:child_process')

const result = spawnSync(
  'npx',
  ['--no-install', 'prettier', '--check', '.'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
)

if (result.error) {
  console.warn(`Formatting check could not be completed: ${result.error.message}`)
  process.exit(0)
}

if (result.status !== 0) {
  console.warn('\nFormatting differences were detected. This is currently a warning and does not fail CI.')
}

process.exit(0)
