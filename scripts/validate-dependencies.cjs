const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const appsRoot = path.join(root, 'apps')
const packagesRoot = path.join(root, 'packages')

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const listWorkspaceDirectories = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name))
    .filter((entry) => fs.existsSync(path.join(entry, 'package.json')))
}

const workspaceDirectories = [
  ...listWorkspaceDirectories(appsRoot),
  ...listWorkspaceDirectories(packagesRoot),
]

const workspaceNames = new Map()
const failures = []

for (const directory of workspaceDirectories) {
  const packagePath = path.join(directory, 'package.json')
  const pkg = readJson(packagePath)
  const relative = path.relative(root, directory).replaceAll(path.sep, '/')

  if (workspaceNames.has(pkg.name)) {
    failures.push(`Duplicate workspace package name: ${pkg.name}`)
  } else {
    workspaceNames.set(pkg.name, relative)
  }

  if (relative.startsWith('apps/') && !pkg.name.startsWith('@express-app/')) {
    failures.push(`${relative}/package.json must use the @express-app/* package naming convention.`)
  }
}

const rootPackage = readJson(path.join(root, 'package.json'))
for (const field of ['dependencies', 'optionalDependencies']) {
  const entries = Object.keys(rootPackage[field] || {})
  if (entries.length > 0) {
    failures.push(`Root package.json must not declare runtime ${field}; move runtime dependencies to the workspace that owns them: ${entries.join(', ')}`)
  }
}

const sourceExtensions = /\.(?:js|cjs|mjs|jsx|ts|tsx)$/
const importPatterns = [
  /(?:import\s+(?:[^'"`]+?\s+from\s+)?|export\s+[^'"`]+?\s+from\s+|require\s*\(|import\s*\()(['"`])([^'"`]+)\1/g,
]

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(full)
    return sourceExtensions.test(entry.name) ? [full] : []
  })
}

for (const appDirectory of listWorkspaceDirectories(appsRoot)) {
  const appRelative = path.relative(root, appDirectory).replaceAll(path.sep, '/')
  const appName = path.basename(appDirectory)

  for (const file of walk(appDirectory)) {
    const source = fs.readFileSync(file, 'utf8')
    const relativeFile = path.relative(root, file).replaceAll(path.sep, '/')

    for (const pattern of importPatterns) {
      for (const match of source.matchAll(pattern)) {
        const specifier = match[2]
        if (!specifier.startsWith('.')) continue

        const resolved = path.resolve(path.dirname(file), specifier)
        const targetRelative = path.relative(root, resolved).replaceAll(path.sep, '/')
        if (targetRelative.startsWith('apps/')) {
          const targetApp = targetRelative.split('/')[1]
          if (targetApp && targetApp !== appName) {
            failures.push(`${relativeFile}: workspace ${appRelative} must not import source files directly from apps/${targetApp}; use a shared workspace package.`)
          }
        }
      }
    }
  }
}

if (failures.length) {
  console.error('Workspace dependency validation failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Workspace dependency validation passed: ${workspaceNames.size} workspace package(s).`)
