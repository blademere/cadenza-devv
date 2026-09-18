const CADENZA_APP_KEY = 'cadenza'
const CADENZA_RESOURCE_TYPES = Object.freeze({ INSTRUMENT: 'CADENZA_INSTRUMENT', ROOM: 'CADENZA_ROOM' })
const CADENZA_STATUSES = Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' })
export { CADENZA_APP_KEY, CADENZA_RESOURCE_TYPES, CADENZA_STATUSES }

// Identity is owned by the platform Person model; Cadenza stores only the application-specific role and metadata.
