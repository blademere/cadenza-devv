const { spawnSync } = require('node:child_process');

const result = spawnSync('npm', ['audit', '--audit-level=high', '--json'], {
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'inherit'],
});

let report;
try {
  report = JSON.parse(result.stdout || '{}');
} catch {
  process.stderr.write(result.stdout || 'npm audit did not return valid JSON\n');
  process.exit(result.status ?? 1);
}

const allowed = new Set(['deepmerge-ts']);
const vulnerabilities = Object.entries(report.vulnerabilities || {});
const blocking = vulnerabilities.filter(([name, advisory]) => {
  if (advisory.severity !== 'high' && advisory.severity !== 'critical') return false;
  if (!allowed.has(name)) return true;

  const via = Array.isArray(advisory.via) ? advisory.via : [];
  const isPrismaTransitive = via.some((entry) =>
    typeof entry === 'object' &&
    entry.source === 1090102 &&
    typeof entry.url === 'string' &&
    entry.url.includes('GHSA-ggr8-5vv4-36mx')
  );

  return !isPrismaTransitive;
});

for (const [name, advisory] of vulnerabilities) {
  const marker = blocking.some(([blockingName]) => blockingName === name) ? 'BLOCK' : 'ALLOW';
  process.stdout.write(`${marker} ${advisory.severity}: ${name} (${advisory.isDirect ? 'direct' : 'transitive'})\n`);
}

if (blocking.length > 0) {
  process.stderr.write(`\n${blocking.length} high/critical vulnerability set(s) require remediation.\n`);
  process.exit(1);
}

process.stdout.write('\nHigh/critical audit passed; the known Prisma 7 deepmerge-ts advisory is explicitly allowed.\n');
