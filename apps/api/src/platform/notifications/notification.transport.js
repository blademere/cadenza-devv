const transports = new Map()
const normalizeChannel = (channel) => String(channel || '').trim().toUpperCase()
const registerNotificationTransport = (channel, transport) => { const normalized = normalizeChannel(channel); if (!normalized) throw new Error('Notification transport channel is required'); if (!transport || typeof transport.send !== 'function') throw new Error(`Notification transport '${normalized}' must implement send()`); transports.set(normalized, transport); return transport }
const unregisterNotificationTransport = (channel) => { transports.delete(normalizeChannel(channel)) }
const getNotificationTransport = (channel) => transports.get(normalizeChannel(channel)) || null
const clearNotificationTransports = () => transports.clear()

export { registerNotificationTransport, unregisterNotificationTransport, getNotificationTransport, clearNotificationTransports }
