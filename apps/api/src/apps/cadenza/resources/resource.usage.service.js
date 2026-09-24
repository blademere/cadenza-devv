import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as resourceService from '../../../features/resources/resource.service.js'
import * as repository from './resource.usage.repository.js'

const listUsage = async ({ appId, resourceId }) => {
  const owner = requireAppId(appId)
  const resource = resourceId
    ? await resourceService.getResource({ id: resourceId, appId: owner })
    : null

  const rows = await repository.listUsage(resource?.id ?? null, owner)
  const completed = rows.filter((row) => row.status === 'RETURNED').length
  const hours = rows.reduce((total, row) => {
    const start = new Date(row.scheduledStart).getTime()
    const end = new Date(row.scheduledEnd).getTime()
    return total + (Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 3600000 : 0)
  }, 0)
  const revenue = rows
    .filter((row) => row.status !== 'CANCELLED')
    .reduce((total, row) => total + Number(row.totalAmount ?? 0), 0)

  return {
    resource,
    data: rows,
    summary: {
      bookings: rows.length,
      completed,
      hours: Number(hours.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
    },
  }
}

export { listUsage }
