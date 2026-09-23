import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Separator } from '../../../components/ui/separator'
import { Textarea } from '../../../components/ui/textarea'
import SelectField from '../../../components/select-field'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { lessonsApi } from '../api/lessons.api'
import { customersApi } from '../../customers/api/customers.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { schedulingApi } from '../../scheduling/api/scheduling.api'
import { instructorsApi } from '../../instructors/api/instructors.api'
import { resourcesApi } from '../../resources/api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const readBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function LessonsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()

  const canCreate = can('cadenza_lessons:create')
  const canManage = can('cadenza_lessons:manage')
  const canEnrollmentCreate = can('cadenza_enrollments:create')
  const canEnrollmentManage = can('cadenza_enrollments:manage')
  const canPay = can('cadenza_payments:create')
  const canSchedule = can('cadenza_lessons:schedule')
  const canAttendance = can('cadenza_lessons:attendance')
  const canRequestReschedule = can('cadenza_lessons:request_reschedule')
  const canInstructorRead = can('cadenza_instructors:read')
  const canRoomRead = can('cadenza_rooms:read')
  const customerView = canEnrollmentCreate && !canCreate && !canManage && !canEnrollmentManage

  const packagesQuery = useQuery({
    queryKey: ['cadenza', 'lesson-packages'],
    queryFn: lessonsApi.listPackages,
  })
  const customersQuery = useQuery({
    queryKey: ['cadenza', 'customers'],
    queryFn: customersApi.list,
    enabled: canEnrollmentManage,
  })
  const enrollmentsQuery = useQuery({
    queryKey: ['cadenza', 'enrollments'],
    queryFn: lessonsApi.listEnrollments,
    enabled: canEnrollmentCreate || canEnrollmentManage,
  })
  const sessionsQuery = useQuery({ queryKey: ['cadenza', 'sessions'], queryFn: schedulingApi.listSessions })
  const instructorsQuery = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list, enabled: canInstructorRead })
  const roomsQuery = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms, enabled: canRoomRead })
  const reschedulesQuery = useQuery({ queryKey: ['cadenza', 'reschedules'], queryFn: schedulingApi.listReschedules, enabled: canManage })

  const [packageOpen, setPackageOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [attachmentPackage, setAttachmentPackage] = useState(null)
  const [payment, setPayment] = useState(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', numberOfSessions: 1 })
  const [enrollForm, setEnrollForm] = useState({ customerId: '', lessonPackageId: '' })
  const [scheduleForm, setScheduleForm] = useState({ enrollmentId: '', instructorId: '', roomId: '', scheduledStart: '', scheduledEnd: '' })
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [attendance, setAttendance] = useState('PRESENT')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [requestOpen, setRequestOpen] = useState(null)

  const create = useMutation({
    mutationFn: lessonsApi.createPackage,
    onSuccess: () => {
      setPackageOpen(false)
      setForm({ name: '', description: '', price: '', numberOfSessions: 1 })
      client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] })
    },
  })

  const enroll = useMutation({
    mutationFn: lessonsApi.enroll,
    onSuccess: (response) => {
      setEnrollOpen(false)
      client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'customers'] })
      const value = response?.data ?? response
      if (value?.paymentObligationId) setPayment(value)
    },
  })

  const attach = useMutation({
    mutationFn: async ({ packageId, selectedFile }) =>
      lessonsApi.addAttachment(packageId, {
        fileName: selectedFile.name,
        contentBase64: await readBase64(selectedFile),
        contentType: selectedFile.type || 'application/pdf',
        type: 'PDF',
      }),
    onSuccess: () => {
      setAttachmentPackage(null)
      setFile(null)
      client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] })
    },
  })

  const pay = useMutation({
    mutationFn: ({ id, amount }) =>
      paymentsApi.pay(id, { amount: String(amount), currency: 'PHP', method: 'CASH' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId] })
      client.invalidateQueries({ queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId] })
    },
  })

  const online = useMutation({
    mutationFn: ({ id, amount }) =>
      paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza lesson enrollment' }),
    onSuccess: (response) => {
      const value = response?.data ?? response
      if (value?.checkoutUrl) window.location.assign(value.checkoutUrl)
      client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] })
    },
  })

  const createSession = useMutation({
    mutationFn: schedulingApi.createSession,
    onSuccess: () => {
      setScheduleOpen(false)
      setScheduleForm({ enrollmentId: '', instructorId: '', roomId: '', scheduledStart: '', scheduledEnd: '' })
      client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] })
    },
  })
  const markAttendance = useMutation({
    mutationFn: ({ id, payload }) => schedulingApi.markAttendance(id, payload),
    onSuccess: () => {
      setSelectedSession(null)
      client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] })
    },
  })
  const sessionTransition = useMutation({
    mutationFn: ({ type, id }) => schedulingApi[type](id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] }),
  })
  const requestReschedule = useMutation({
    mutationFn: schedulingApi.requestReschedule,
    onSuccess: () => setRequestOpen(null),
  })
  const reviewReschedule = useMutation({
    mutationFn: ({ id, approve }) => schedulingApi.reviewReschedule(id, approve),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cadenza', 'reschedules'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'sessions'] })
    },
  })
  const paymentHistory = useQuery({
    queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId],
    queryFn: () => paymentsApi.history(payment.paymentObligationId),
    enabled: Boolean(payment?.paymentObligationId),
  })

  const obligationQuery = useQuery({
    queryKey: ['cadenza', 'payment', payment?.paymentObligationId],
    queryFn: () => paymentsApi.get(payment.paymentObligationId),
    enabled: Boolean(payment?.paymentObligationId),
  })

  const attachmentsQuery = useQuery({
    queryKey: ['cadenza', 'attachments', attachmentPackage?.id],
    queryFn: () => lessonsApi.listAttachments(attachmentPackage.id),
    enabled: Boolean(attachmentPackage?.id),
  })

  const deleteAttachment = useMutation({
    mutationFn: ({ packageId, id }) => lessonsApi.deleteAttachment(packageId, id),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['cadenza', 'attachments', attachmentPackage?.id] }),
  })

  if (packagesQuery.isLoading || sessionsQuery.isLoading || (canEnrollmentManage && customersQuery.isLoading))
    return <LoadingState label="Loading lesson packages…" rows={4} />

  if (packagesQuery.error || customersQuery.error || sessionsQuery.error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{(packagesQuery.error || customersQuery.error).message}</AlertDescription>
      </Alert>
    )

  const packages = unwrap(packagesQuery.data)
  const customers = unwrap(customersQuery.data)
  const enrollments = unwrap(enrollmentsQuery.data)
  const sessions = unwrap(sessionsQuery.data)
  const instructors = unwrap(instructorsQuery.data)
  const rooms = unwrap(roomsQuery.data)
  const pendingReschedules = unwrap(reschedulesQuery.data).filter((item) => item.status === 'PENDING')
  const obligation = obligationQuery.data?.data ?? obligationQuery.data
  const due = obligation?.balanceDue ?? obligation?.totalAmount ?? payment?.amount
  const canCheckout = Boolean(canPay && payment?.status === 'PENDING_PAYMENT' && Number(due) > 0)
  const error = create.error || enroll.error || attach.error || pay.error || online.error || createSession.error || markAttendance.error || sessionTransition.error || requestReschedule.error || reviewReschedule.error

  const openCustomerEnrollment = (lessonPackageId) => {
    setEnrollForm({ customerId: '', lessonPackageId })
    setEnrollOpen(true)
  }

  const openStaffEnrollment = () => {
    setEnrollForm({ customerId: '', lessonPackageId: '' })
    setEnrollOpen(true)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Music Lessons"
        description={
          customerView
            ? 'Choose a lesson package and complete payment to start your enrollment.'
            : 'Manage lesson packages, student enrollments, materials, and the lesson workflow.'
        }
        actions={
          !customerView && (
            <>
              {canEnrollmentManage && (
                <Button variant="outline" onClick={openStaffEnrollment}>
                  Enroll customer
                </Button>
              )}
              {canCreate && <Button onClick={() => setPackageOpen(true)}>Create package</Button>}
            </>
          )
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {customerView ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">Available lesson packages</h2>
            <p className="text-sm text-muted-foreground">
              Select a package. Enrollment is confirmed after the full payment is completed.
            </p>
          </div>

          {packages.filter((item) => item.status === 'ACTIVE').length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No lesson packages are currently available.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {packages
                .filter((item) => item.status === 'ACTIVE')
                .map((item) => (
                  <Card key={item.id} className="flex h-full flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.numberOfSessions} lesson sessions
                          </p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <p className="min-h-12 text-sm text-muted-foreground">
                        {item.description || 'Music lesson package'}
                      </p>
                      <div className="mt-6 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Full package price</p>
                          <p className="text-xl font-bold">{formatCurrency(item.price)}</p>
                        </div>
                        <Button disabled={!canEnrollmentCreate} onClick={() => openCustomerEnrollment(item.id)}>
                          Enroll & Pay
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">My enrollments</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your current and previous lesson enrollments, payment status, and session progress.
                  </p>
                </div>
                <Badge variant="outline">{enrollments.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  You have no lesson enrollments yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {enrollments.map((item) => {
                    const pendingPayment = item.status === 'PENDING_PAYMENT' && item.paymentObligationId
                    return (
                      <div key={item.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{item.lessonPackage?.name ?? item.lessonPackageId}</p>
                              <Badge variant={item.status === 'PENDING_PAYMENT' ? 'outline' : 'secondary'}>{item.status}</Badge>
                            </div>
                            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                              <span>Enrolled {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</span>
                              <span>{item.progress?.completedSessions ?? 0}/{item.progress?.totalSessions ?? item.lessonPackage?.numberOfSessions ?? 0} sessions completed</span>
                              <span>{item.progress?.remainingSessions ?? item.lessonPackage?.numberOfSessions ?? 0} remaining</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedEnrollment(item)}>View details</Button>
                            {pendingPayment && canPay && (
                              <Button size="sm" onClick={() => setPayment(item)}>Pay online</Button>
                            )}
                            {!pendingPayment && item.paymentObligationId && canPay && (
                              <Button size="sm" variant="outline" onClick={() => setPayment(item)}>Payment history</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active packages</p>
                <p className="mt-1 text-2xl font-bold">
                  {packages.filter((item) => item.status === 'ACTIVE').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Enrollments</p>
                <p className="mt-1 text-2xl font-bold">{enrollments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Payment pending</p>
                <p className="mt-1 text-2xl font-bold">
                  {enrollments.filter((item) => item.status === 'PENDING_PAYMENT').length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lesson packages</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'name', header: 'Package', value: (item) => item.name },
                  { key: 'sessions', header: 'Sessions', value: (item) => item.numberOfSessions },
                  { key: 'price', header: 'Price', value: (item) => formatCurrency(item.price) },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => <Badge variant="secondary">{item.status}</Badge>,
                  },
                  {
                    key: 'materials',
                    header: 'Materials',
                    value: (item) => item._count?.attachments ?? 0,
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    searchable: false,
                    render: (item) =>
                      canManage ? (
                        <Button size="sm" variant="outline" onClick={() => setAttachmentPackage(item)}>
                          Manage materials
                        </Button>
                      ) : null,
                  },
                ]}
                rows={packages}
                searchPlaceholder="Search lesson packages…"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Enrollments</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Track payment, session progress, and student lesson status.
                  </p>
                </div>
                <Badge variant="outline">{enrollments.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: 'student',
                    header: 'Student',
                    value: (item) =>
                      item.customer?.person?.name ??
                      item.customer?.person?.fullName ??
                      item.customerId ??
                      '—',
                  },
                  {
                    key: 'package',
                    header: 'Package',
                    value: (item) => item.lessonPackage?.name ?? item.lessonPackageId,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => <Badge variant="secondary">{item.status}</Badge>,
                  },
                  {
                    key: 'progress',
                    header: 'Progress',
                    value: (item) =>
                      `${item.progress?.completedSessions ?? 0}/${item.progress?.totalSessions ?? 0} sessions`,
                  },
                  {
                    key: 'payment',
                    header: 'Payment',
                    render: (item) => (
                      <Badge variant="secondary">
                        {item.status === 'PENDING_PAYMENT' ? 'Payment due' : 'Paid / linked'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    searchable: false,
                    render: (item) =>
                      item.paymentObligationId && canPay && item.status === 'PENDING_PAYMENT' ? (
                        <Button size="sm" onClick={() => setPayment(item)}>
                          Record payment
                        </Button>
                      ) : null,
                  },
                ]}
                rows={enrollments}
                searchPlaceholder="Search enrollments…"
              />
            </CardContent>
          </Card>
        </>
      )}


          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{customerView ? 'My lesson schedule' : 'Lesson sessions'}</CardTitle>
                  <p className="text-sm text-muted-foreground">{customerView ? 'View your sessions and request a new time when needed.' : 'Schedule, assign, track attendance, reschedule, and complete every lesson session here.'}</p>
                </div>
                {canSchedule && (
                  <Button onClick={() => {
                    const confirmed = enrollments.filter((item) => item.status === 'CONFIRMED')
                    setScheduleForm({ enrollmentId: confirmed[0]?.id ?? '', instructorId: '', roomId: '', scheduledStart: '', scheduledEnd: '' })
                    setScheduleOpen(true)
                  }}>Schedule session</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No lesson sessions scheduled yet.</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'date', header: 'Date', value: (item) => new Date(item.scheduledStart).toLocaleString() },
                    { key: 'student', header: 'Student', value: (item) => item.enrollment?.customer?.person?.name ?? item.enrollment?.customer?.person?.fullName ?? item.enrollmentId ?? '—' },
                    { key: 'instructor', header: 'Instructor', value: (item) => item.instructor?.person?.name ?? item.instructorId ?? 'Unassigned' },
                    { key: 'room', header: 'Room', value: (item) => item.room?.name ?? item.roomId ?? 'Unassigned' },
                    { key: 'attendance', header: 'Attendance', value: (item) => item.attendance?.status ?? '—' },
                    { key: 'status', header: 'Status', render: (item) => <Badge variant="secondary">{item.status}</Badge> },
                    { key: 'actions', header: 'Actions', searchable: false, render: (item) => (
                      <div className="flex flex-wrap gap-2">
                        {canAttendance && item.status === 'SCHEDULED' && <Button size="sm" onClick={() => { setSelectedSession(item); setAttendance(item.attendance?.status ?? 'PRESENT'); setAttendanceNotes(item.attendance?.notes ?? '') }}>Attendance</Button>}
                        {canRequestReschedule && item.status === 'SCHEDULED' && <Button size="sm" variant="outline" onClick={() => setRequestOpen({ id: item.id, requestedStart: '', requestedEnd: '', reason: '' })}>Reschedule</Button>}
                        {canManage && item.status === 'SCHEDULED' && <><Button size="sm" variant="outline" onClick={() => sessionTransition.mutate({ type: 'completeSession', id: item.id })}>Complete</Button><Button size="sm" variant="destructive" onClick={() => sessionTransition.mutate({ type: 'cancelSession', id: item.id })}>Cancel</Button></>}
                      </div>
                    )},
                  ]}
                  rows={sessions}
                  searchPlaceholder="Search lesson sessions…"
                />
              )}
            </CardContent>
          </Card>
          {canManage && (
            <Card>
              <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Reschedule requests</CardTitle><p className="text-sm text-muted-foreground">Review student requests before changing a session.</p></div><Badge variant="outline">{pendingReschedules.length}</Badge></div></CardHeader>
              <CardContent>
                {pendingReschedules.length === 0 ? <p className="text-sm text-muted-foreground">No pending reschedule requests.</p> : <div className="space-y-2">{pendingReschedules.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{new Date(item.requestedStart).toLocaleString()}</p>{item.reason && <p className="text-xs text-muted-foreground">{item.reason}</p>}</div><div className="flex gap-2"><Button size="sm" onClick={() => reviewReschedule.mutate({ id: item.id, approve: true })}>Approve</Button><Button size="sm" variant="destructive" onClick={() => reviewReschedule.mutate({ id: item.id, approve: false })}>Reject</Button></div></div>)}</div>}
              </CardContent>
            </Card>
          )}

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Schedule lesson session</DialogTitle><DialogDescription>Only confirmed, fully paid enrollments can be scheduled.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            {enrollments.filter((item) => item.status === 'CONFIRMED').length === 0 && <Alert><AlertDescription>No confirmed enrollments are available. Complete enrollment payment first.</AlertDescription></Alert>}
            <SelectField label="Enrollment" options={enrollments.filter((item) => item.status === 'CONFIRMED').map((item) => ({ value: item.id, label: item.lessonPackage?.name ?? item.id }))} value={scheduleForm.enrollmentId} onChange={(value) => setScheduleForm({ ...scheduleForm, enrollmentId: value || '' })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Instructor" options={instructors.map((item) => ({ value: item.id, label: item.person?.name ?? item.id }))} value={scheduleForm.instructorId} onChange={(value) => setScheduleForm({ ...scheduleForm, instructorId: value || '' })} placeholder="Select instructor" />
              <SelectField label="Room" options={rooms.map((item) => ({ value: item.id, label: item.name ?? item.roomType ?? item.id }))} value={scheduleForm.roomId} onChange={(value) => setScheduleForm({ ...scheduleForm, roomId: value || '' })} placeholder="Select room" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={scheduleForm.scheduledStart} onChange={(event) => setScheduleForm({ ...scheduleForm, scheduledStart: event.currentTarget.value })} /></div>
              <div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={scheduleForm.scheduledEnd} onChange={(event) => setScheduleForm({ ...scheduleForm, scheduledEnd: event.currentTarget.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button disabled={!scheduleForm.enrollmentId || !scheduleForm.scheduledStart || !scheduleForm.scheduledEnd || createSession.isPending} onClick={() => createSession.mutate({ ...scheduleForm, scheduledStart: new Date(scheduleForm.scheduledStart).toISOString(), scheduledEnd: new Date(scheduleForm.scheduledEnd).toISOString() })}>{createSession.isPending ? 'Scheduling…' : 'Schedule session'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Record attendance</DialogTitle><DialogDescription>Save attendance for this lesson session.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <SelectField label="Attendance" options={['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((value) => ({ value, label: value }))} value={attendance} onChange={(value) => setAttendance(value || 'PRESENT')} />
            <div className="grid gap-2"><Label>Notes</Label><Textarea value={attendanceNotes} onChange={(event) => setAttendanceNotes(event.currentTarget.value)} /></div>
          </div>
          <DialogFooter><Button disabled={markAttendance.isPending} onClick={() => markAttendance.mutate({ id: selectedSession.id, payload: { status: attendance, notes: attendanceNotes || undefined } })}>{markAttendance.isPending ? 'Saving…' : 'Save attendance'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(requestOpen)} onOpenChange={(open) => !open && setRequestOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Request reschedule</DialogTitle><DialogDescription>Choose the requested replacement time for this lesson session.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Requested start</Label><Input type="datetime-local" value={requestOpen?.requestedStart ?? ''} onChange={(event) => setRequestOpen({ ...requestOpen, requestedStart: event.currentTarget.value })} /></div>
            <div className="grid gap-2"><Label>Requested end</Label><Input type="datetime-local" value={requestOpen?.requestedEnd ?? ''} onChange={(event) => setRequestOpen({ ...requestOpen, requestedEnd: event.currentTarget.value })} /></div>
            <div className="grid gap-2"><Label>Reason</Label><Textarea value={requestOpen?.reason ?? ''} onChange={(event) => setRequestOpen({ ...requestOpen, reason: event.currentTarget.value })} /></div>
          </div>
          <DialogFooter><Button disabled={!requestOpen?.requestedStart || !requestOpen?.requestedEnd || requestReschedule.isPending} onClick={() => requestReschedule.mutate({ sessionId: requestOpen.id, requestedStart: new Date(requestOpen.requestedStart).toISOString(), requestedEnd: new Date(requestOpen.requestedEnd).toISOString(), reason: requestOpen.reason || undefined })}>{requestReschedule.isPending ? 'Submitting…' : 'Submit request'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={packageOpen} onOpenChange={setPackageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create lesson package</DialogTitle>
            <DialogDescription>Define the package students can purchase.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Price</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.currentTarget.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Sessions</Label>
              <Input
                type="number"
                min="1"
                value={form.numberOfSessions}
                onChange={(event) => setForm({ ...form, numberOfSessions: event.currentTarget.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.name || !form.price}
              onClick={() =>
                create.mutate({
                  ...form,
                  price: String(form.price),
                  numberOfSessions: Number(form.numberOfSessions),
                })
              }
            >
              {create.isPending ? 'Creating…' : 'Create package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canEnrollmentManage ? 'Enroll customer' : 'Enroll in lesson package'}</DialogTitle>
            <DialogDescription>
              Enrollment creates a full-payment obligation. The enrollment becomes confirmed after payment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {canEnrollmentManage && (
              <SelectField
                label="Customer"
                options={customers.map((item) => ({
                  value: item.id,
                  label: item.person?.name ?? item.person?.fullName ?? item.id,
                }))}
                value={enrollForm.customerId}
                onChange={(value) => setEnrollForm({ ...enrollForm, customerId: value || '' })}
                placeholder="Choose a customer"
              />
            )}
            <SelectField
              label="Package"
              options={packages
                .filter((item) => item.status === 'ACTIVE')
                .map((item) => ({ value: item.id, label: item.name }))}
              value={enrollForm.lessonPackageId}
              onChange={(value) => setEnrollForm({ ...enrollForm, lessonPackageId: value || '' })}
              placeholder="Choose a package"
              disabled={customerView}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={
                !enrollForm.lessonPackageId ||
                (canEnrollmentManage && !enrollForm.customerId)
              }
              onClick={() =>
                enroll.mutate(
                  canEnrollmentManage
                    ? enrollForm
                    : { lessonPackageId: enrollForm.lessonPackageId },
                )
              }
            >
              {enroll.isPending ? 'Creating…' : customerView ? 'Continue to payment' : 'Create enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(attachmentPackage)}
        onOpenChange={(open) => !open && setAttachmentPackage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lesson materials</DialogTitle>
            <DialogDescription>
              PDF materials attached to {attachmentPackage?.name ?? 'this package'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {(attachmentsQuery.data?.data ?? attachmentsQuery.data ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                <span className="min-w-0 truncate text-sm">
                  {item.metadata?.fileName ?? item.type}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const response = await lessonsApi.getAttachmentUrl(attachmentPackage.id, item.id)
                      const value = response?.data ?? response
                      if (value?.url) window.open(value.url, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteAttachment.mutate({ packageId: attachmentPackage.id, id: item.id })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            <Input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <Button
              disabled={!file}
              onClick={() => attach.mutate({ packageId: attachmentPackage.id, selectedFile: file })}
            >
              {attach.isPending ? 'Uploading…' : 'Upload PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedEnrollment)} onOpenChange={(open) => !open && setSelectedEnrollment(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEnrollment?.lessonPackage?.name ?? 'Lesson enrollment'}</DialogTitle>
            <DialogDescription>
              Enrollment details, payment state, and scheduled lesson sessions.
            </DialogDescription>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Enrollment status</p>
                  <p className="mt-1 font-semibold">{selectedEnrollment.status}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="mt-1 font-semibold">{selectedEnrollment.progress?.completedSessions ?? 0}/{selectedEnrollment.progress?.totalSessions ?? selectedEnrollment.lessonPackage?.numberOfSessions ?? 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="mt-1 font-semibold">{selectedEnrollment.status === 'PENDING_PAYMENT' ? 'Payment due' : 'Paid / linked'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Lesson sessions</h3>
                <div className="mt-2 grid gap-2">
                  {(selectedEnrollment.sessions ?? []).length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No lesson sessions have been scheduled yet.</p>
                  ) : (
                    (selectedEnrollment.sessions ?? []).map((session) => (
                      <div key={session.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">{session.scheduledStart ? new Date(session.scheduledStart).toLocaleString() : 'Schedule pending'}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.instructor?.person?.name ?? 'Instructor unassigned'} · {session.room?.name ?? 'Room unassigned'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{session.status}</Badge>
                          {session.attendance?.status && <Badge variant="outline">{session.attendance.status}</Badge>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && setPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{customerView ? 'Lesson payment' : 'Complete lesson enrollment'}</DialogTitle>
            <DialogDescription>
              {payment?.status === 'PENDING_PAYMENT'
                ? customerView
                  ? 'Complete the outstanding balance online. Your enrollment is confirmed after the payment settles.'
                  : 'This package requires full payment before the enrollment is confirmed.'
                : 'Review the payment history for this lesson enrollment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Package</p>
              <p className="font-semibold">{payment?.lessonPackage?.name ?? 'Lesson enrollment'}</p>
              <p className="mt-3 text-sm text-muted-foreground">Amount due</p>
              <p className="text-2xl font-bold">{formatCurrency(due)}</p>
            </div>

            <Separator />

            {(paymentHistory.data?.data ?? paymentHistory.data ?? []).map((entry) => (
              <p key={entry.id} className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()} — {formatCurrency(entry.amount)} — {entry.status}
              </p>
            ))}

            <div className="grid gap-2 sm:grid-cols-2">
              {!customerView && (
                <Button
                  disabled={!due || !canPay || pay.isPending}
                  onClick={() => pay.mutate({ id: payment.paymentObligationId, amount: due })}
                >
                  {pay.isPending ? 'Recording…' : 'Pay at front desk'}
                </Button>
              )}
              {canCheckout && (
                <Button
                  variant={customerView ? 'default' : 'outline'}
                  disabled={!canCheckout || online.isPending}
                  onClick={() => online.mutate({ id: payment.paymentObligationId, amount: due })}
                >
                  {online.isPending ? 'Opening…' : 'Pay online'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
