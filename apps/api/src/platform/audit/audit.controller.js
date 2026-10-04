import {
  listAuditLogs,
  getEntityTimeline,
} from './audit.query.service.js'

const listAuditLogsController = async (req, res) => {
  const result = await listAuditLogs(req.validated.query)
  return res.status(200).json({
    success: true,
    message: 'Audit logs retrieved successfully.',
    data: result.data,
    pagination: result.pagination,
  })
}

const timelineController = async (req, res) => {
  const result = await getEntityTimeline({
    ...req.validated.query,
    ...req.validated.params,
  })
  return res.status(200).json({
    success: true,
    message: 'Activity timeline retrieved successfully.',
    data: result.data,
    pagination: result.pagination,
  })
}

export { listAuditLogsController, timelineController }
