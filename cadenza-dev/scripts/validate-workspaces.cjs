const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const rootPackagePath = path.join(root, 'package.json');
const lockfilePath = path.join(root, 'package-lock.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to read ${path.relative(root, filePath)}: ${error.message}`,
    );
  }
}

function resolveWorkspaceDirectories(pattern) {
  if (!pattern.endsWith('/*')) return [pattern];
  const parent = pattern.slice(0, -2);
  const parentPath = path.join(root, parent);
  if (!fs.existsSync(parentPath)) return [];
  return fs
    .readdirSync(parentPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name))
    .filter((workspacePath) =>
      fs.existsSync(path.join(root, workspacePath, 'package.json')),
    );
}

function assertWorkspacePackage(workspacePath, names) {
  const packagePath = path.join(root, workspacePath, 'package.json');
  const pkg = readJson(packagePath);
  if (!pkg.name || typeof pkg.name !== 'string')
    throw new Error(`${workspacePath}/package.json must define a package name`);
  if (names.has(pkg.name))
    throw new Error(`Duplicate workspace package name: ${pkg.name}`);
  if (pkg.private !== true)
    throw new Error(
      `${workspacePath}/package.json must be private because workspace packages are internal.`,
    );
  names.add(pkg.name);
}

function assertNoNestedLockfiles(workspacePath) {
  for (const file of ['package-lock.json', 'npm-shrinkwrap.json']) {
    if (fs.existsSync(path.join(root, workspacePath, file))) {
      throw new Error(
        `Nested ${file} is not allowed: ${workspacePath}/${file}. Use the root lockfile.`,
      );
    }
  }
}

function main() {
  const rootPackage = readJson(rootPackagePath);
  if (
    !Array.isArray(rootPackage.workspaces) ||
    rootPackage.workspaces.length === 0
  )
    throw new Error(
      'Root package.json must define a non-empty workspaces array',
    );
  if (!fs.existsSync(lockfilePath))
    throw new Error('Root package-lock.json is required for the npm workspace');
  const lockfile = readJson(lockfilePath);
  if (lockfile.lockfileVersion !== 3)
    throw new Error(
      `Expected package-lock.json lockfileVersion 3, found ${lockfile.lockfileVersion}`,
    );
  const names = new Set();
  const workspacePaths = rootPackage.workspaces.flatMap(
    resolveWorkspaceDirectories,
  );
  for (const workspacePath of workspacePaths) {
    assertWorkspacePackage(workspacePath, names);
    assertNoNestedLockfiles(workspacePath);
  }
  const lockPackages = lockfile.packages || {};
  for (const workspacePath of workspacePaths) {
    // package-lock.json always uses POSIX separators, including on Windows.
    const lockWorkspacePath = workspacePath.split(path.sep).join('/');
    if (!lockPackages[lockWorkspacePath])
      throw new Error(
        `Workspace ${workspacePath} is missing from package-lock.json`,
      );
  }
  console.log(
    `Workspace validation passed: ${workspacePaths.length} workspace(s), ${names.size} unique package name(s).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Workspace validation failed: ${error.message}`);
  process.exitCode = 1;
}
