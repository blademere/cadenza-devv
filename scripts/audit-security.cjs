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

function advisoryIds(advisory) {
  const via = Array.isArray(advisory?.via) ? advisory.via : [];
  return via.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];

    const ids = [];
    if (typeof entry.url === 'string') {
      const match = entry.url.match(/GHSA-[a-z0-9-]+/i);
      if (match) ids.push(match[0].toUpperCase());
    }
    if (typeof entry.source === 'number') ids.push(String(entry.source));
    return ids;
  });
}

function isAllowed(name, seen = new Set()) {
  if (seen.has(name)) return false;
  seen.add(name);

  const advisory = vulnerabilityMap.get(name);
  if (!advisory) return false;

  if (advisoryIds(advisory).some((id) => ALLOWED_ADVISORIES.has(id))) {
    return true;
  }

  const via = Array.isArray(advisory.via) ? advisory.via : [];
  return via.some(
    (entry) =>
      typeof entry === 'string' && isAllowed(entry, new Set(seen)),
  );
}

const blocking = vulnerabilities.filter(([name, advisory]) => {
  if (advisory.severity !== 'high' && advisory.severity !== 'critical') {
    return false;
  }

  return !isAllowed(name);
});

for (const [name, advisory] of vulnerabilities) {
  const allowed = isAllowed(name);
  const isBlocking = blocking.some(([blockingName]) => blockingName === name);
  const marker = allowed ? 'ALLOW' : isBlocking ? 'BLOCK' : 'INFO';
  const ids = advisoryIds(advisory);
  const suffix = ids.length > 0 ? ` [${ids.join(', ')}]` : '';

  process.stdout.write(
    `${marker} ${advisory.severity}: ${name} (${advisory.isDirect ? 'direct' : 'transitive'})${suffix}\n`,
  );
}

if (blocking.length > 0) {
  process.stderr.write(
    `\n${blocking.length} high/critical vulnerability set(s) require remediation.\n`,
  );
  process.exit(1);
}

process.stdout.write('\nHigh/critical dependency audit passed.\n');
