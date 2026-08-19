const service = require('./submission-appointment.service')

const createSubmissionAppointmentController = async (req, res) => {
  const appointment = await service.createSubmissionAppointment({
    applicationId: Number(req.params.applicationId),
    userId: req.user.id,
    input: req.body,
  })

  res.status(201).json({ data: appointment })
}

const listSubmissionAppointmentsController = async (req, res) => {
  const appointments = await service.listSubmissionAppointments({
    applicationId: Number(req.params.applicationId),
    userId: req.user.id,
  })

  res.json({ data: appointments })
}

const cancelSubmissionAppointmentController = async (req, res) => {
  const appointment = await service.cancelSubmissionAppointment({
    applicationId: Number(req.params.applicationId),
    appointmentId: Number(req.params.appointmentId),
    userId: req.user.id,
  })

  res.json({ data: appointment })
}

module.exports = {
  createSubmissionAppointmentController,
  listSubmissionAppointmentsController,
  cancelSubmissionAppointmentController,
}
