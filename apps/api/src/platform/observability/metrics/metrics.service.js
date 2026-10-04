const counters = new Map()
const durations = new Map()

const normalizeName = (name) => {
  if (typeof name !== 'string' || !name.trim()) throw new TypeError('Metric name is required.')
  return name.trim()
}

const normalizeLabels = (labels = {}) => {
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) return {}
  return Object.fromEntries(
    Object.entries(labels)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

const labelKey = (labels) => JSON.stringify(normalizeLabels(labels))

const increment = (name, labels = {}, value = 1) => {
  const metric = normalizeName(name)
  const amount = Number(value)
  if (!Number.isFinite(amount)) throw new TypeError('Metric increment must be finite.')
  const key = `${metric}:${labelKey(labels)}`
  counters.set(key, (counters.get(key) || 0) + amount)
  return counters.get(key)
}

const observe = (name, durationMs, labels = {}) => {
  const metric = normalizeName(name)
  const duration = Number(durationMs)
  if (!Number.isFinite(duration) || duration < 0) throw new TypeError('Metric duration must be a non-negative finite number.')
  const key = `${metric}:${labelKey(labels)}`
  const current = durations.get(key) || { count: 0, totalMs: 0, minMs: duration, maxMs: duration }
  current.count += 1
  current.totalMs += duration
  current.minMs = Math.min(current.minMs, duration)
  current.maxMs = Math.max(current.maxMs, duration)
  durations.set(key, current)
  return current
}

const snapshot = () => ({
  counters: Object.fromEntries(counters.entries()),
  durations: Object.fromEntries(durations.entries()),
})

const reset = () => {
  counters.clear()
  durations.clear()
}

export { increment, observe, snapshot, reset, normalizeLabels }
