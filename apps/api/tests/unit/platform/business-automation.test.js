import { describe, expect, it } from 'vitest'
const { render } = await import('../../../src/platform/notifications/notification.service.js')

describe('business automation capability', () => {
  it('renders nested notification context variables', () => expect(render('Hello {{ user.name }}, application {{ application.number }}', { user: { name: 'Juan' }, application: { number: 'BP-1001' } })).toBe('Hello Juan, application BP-1001'))
})
