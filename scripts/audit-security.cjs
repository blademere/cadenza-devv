const { spawnSync } = require('node:child_process');

const ALLOWED_ADVISORIES = new Set([
  'GHSA-GGR8-5VV4-36MX',
  'GHSA-5P4M-2WFM-XMQ',
]);

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

const vulnerabilities = Object.entries(report.vulnerabilities || {});
const vulnerabilityMap = new Map(vulnerabilities);
let allowedCount = 0;

const getAdvisoryIds = (advisory) => {
  const via = Array.isArray(advisory?.via) ? advisory.via : [];
  return via.flatMap((entry) => {
    if (typeof entry !== 'object' || !entry) return [];
    const ids = [];
    if (typeof entry.url === 'string') {
      const match = entry.url.match(/GHSA-[a-z0-9-]+/i);
      if (match) ids.push(match[0].toUpperCase());
    }
    if (typeof entry.source === 'number') ids.push(String(entry.source));
    return ids;
  });
};

const hasAllowedAdvisory = (name, seen = new Set()) => {
  if (seen.has(name)) return false;
  seen.add(name);

  const advisory = vulnerabilityMap.get(name);
  if (!advisory) return false;

  if (getAdvisoryIds(advisory).some((id) => ALLOWED_ADVISORIES.has(id))) {
    return true;
  }

  const via = Array.isArray(advisory?.via) ? advisory.via : [];
  return via.some((entry) => typeof entry === 'string' && hasAllowedAdvisory(entry, seen));
};

const blocking = vulnerabilities.filter(([name, advisory]) => {
  if (advisory.severity !== 'high' && advisory.severity !== 'critical') return false;

  const allowed = hasAllowedAdvisory(name);
  if (allowed) allowedCount += 1;
  return !allowed;
});

for (const [name, advisory] of vulnerabilities) {
  const allowed = hasAllowedAdvisory(name);
  const isBlocking = blocking.some(([blockingName]) => blockingName === name);
  const marker = allowed ? 'ALLOW' : isBlocking ? 'BLOCK' : 'INFO';
  const advisoryIds = getAdvisoryIds(advisory);
  const ids = advisoryIds.length > 0 ? ` [${advisoryIds.join(', ')}]` : '';
  process.stdout.write(
    `${marker} ${advisory.severity}: ${name} (${advisory.isDirect ? 'direct' : 'transitive'})${ids}\n`,
  );
}

if (allowedCount > 0) {
  process.stdout.write(`Approved high/critical advisories: ${allowedCount}\n`);
}

if (blocking.length > 0) {
  process.stderr.write(
    `\n${blocking.length} high/critical vulnerability set(s) require remediation.\n`,
  );
  process.exit(1);
}

process.stdout.write('\nHigh/critical dependency audit passed.\n');
