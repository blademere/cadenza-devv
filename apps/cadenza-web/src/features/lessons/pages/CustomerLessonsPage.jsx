import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Textarea } from '../../../components/ui/textarea'
import { Label } from '../../../components/ui/label'
import { formatCurrency } from '../../../utils/currency'
import { lessonsApi } from '../api/lessons.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { schedulingApi } from '../../scheduling/api/scheduling.api'

const unwrap = (value) => value?.data ?? value ?? []

export default function CustomerLessonsPage() {
  const client = useQueryClient()
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)
  const [payment, setPayment] = useState(null)
  const [rescheduleSession, setRescheduleSession] = useState(null)
  const [reason, setReason] = useState('')

  const packages = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })
  const enrollments = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments })
  const sessions = useQuery({ queryKey: ['cadenza', 'customer', 'sessions'], queryFn: schedulingApi.listSessions })
  const obligation = useQuery({
    queryKey: ['cadenza', 'payment', payment?.paymentObligationId],
    queryFn: () => paymentsApi.get(payment.paymentObligationId),
    enabled: Boolean(payment?.paymentObligationId),
  })
  const history = useQuery({
    queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId],
    queryFn: () => paymentsApi.history(payment.paymentObligationId),
    enabled: Boolean(payment?.paymentObligationId),
  })
  const enroll = useMutation({
    mutationFn: lessonsApi.enroll,
    onSuccess: (response) => {
      setSelectedPackage(null)
      const value = unwrap(response)
      if (value?.paymentObligationId) setPayment(value)
      client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] })
    },
  })
  const checkout = useMutation({
    mutationFn: ({ id, amount }) => paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza lesson enrollment' }),
    onSuccess: (response) => {
      const value = unwrap(response)
      if (value?.checkoutUrl) window.location.assign(value.checkoutUrl)
    },
  })
  const requestReschedule = useMutation({
    mutationFn: schedulingApi.requestReschedule,
    onSuccess: () => {
      setRescheduleSession(null)
      setReason('')
      client.invalidateQueries({ queryKey: ['cadenza', 'customer', 'sessions'] })
    },
  })

  if (packages.isLoading || enrollments.isLoading || sessions.isLoading) return <LoadingState label="Loading your lessons…" rows={5} />
  const error = packages.error || enrollments.error || sessions.error || enroll.error || checkout.error || requestReschedule.error
  if (error) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>

  const packageRows = unwrap(packages.data).filter((item) => item.status === 'ACTIVE')
  const enrollmentRows = unwrap(enrollments.data)
  const sessionRows = unwrap(sessions.data)
  const currentPayment = unwrap(obligation.data)
  const due = Number(currentPayment?.balanceDue ?? payment?.amount ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader title="My Lessons" description="Enroll in lessons, manage your schedule, review progress, and keep track of payments." />

      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Available lesson packages</h2><p className="text-sm text-muted-foreground">Choose a package and complete the full payment to activate your enrollment.</p></div>
        {packageRows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No lesson packages are currently available.</CardContent></Card> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{packageRows.map((item) =>
            <Card key={item.id} className="flex h-full flex-col">
              <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{item.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.numberOfSessions} sessions</p></div><Badge variant="secondary">Active</Badge></div></CardHeader>
              <CardContent className="flex flex-1 flex-col"><p className="min-h-12 text-sm text-muted-foreground">{item.description || 'Music lesson package'}</p><div className="mt-6 flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">Package price</p><p className="text-xl font-bold">{formatCurrency(item.price)}</p></div><Button onClick={() => setSelectedPackage(item)}>Enroll</Button></div></CardContent>
            </Card>
          )}</div>}
      </section>

      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">My enrollments</h2><p className="text-sm text-muted-foreground">See payment status and lesson progress for every enrollment.</p></div>
        {enrollmentRows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">You have no lesson enrollments yet.</CardContent></Card> :
          <div className="grid gap-3">{enrollmentRows.map((item) => {
            const pending = item.status === 'PENDING_PAYMENT' && item.paymentObligationId
            return <Card key={item.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.lessonPackage?.name ?? item.lessonPackageId}</p><Badge variant={pending ? 'outline' : 'secondary'}>{item.status}</Badge></div><p className="text-sm text-muted-foreground">{item.progress?.completedSessions ?? 0}/{item.progress?.totalSessions ?? item.lessonPackage?.numberOfSessions ?? 0} sessions completed</p></div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedEnrollment(item)}>View details</Button>{pending && <Button size="sm" onClick={() => setPayment(item)}>Pay now</Button>}{!pending && item.paymentObligationId && <Button size="sm" variant="outline" onClick={() => setPayment(item)}>Payment history</Button>}</div>
            </CardContent></Card>
          })}</div>}
      </section>

      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">My lesson schedule</h2><p className="text-sm text-muted-foreground">Your assigned sessions and rescheduling options.</p></div>
        {sessionRows.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No lesson sessions scheduled yet.</CardContent></Card> :
          <div className="grid gap-3">{sessionRows.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{item.enrollment?.lessonPackage?.name ?? 'Music lesson'}</p><p className="text-sm text-muted-foreground">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : 'Schedule pending'} · {item.room?.name ?? item.room?.resource?.name ?? 'Room pending'}</p><p className="text-sm text-muted-foreground">Instructor: {item.instructor?.person?.fullName ?? item.instructor?.person?.firstName ?? 'Assigned by Cadenza'}</p></div><div className="flex items-center gap-2"><Badge variant="secondary">{item.attendance?.status ?? item.status}</Badge>{['SCHEDULED','RESERVED'].includes(item.status) && <Button size="sm" variant="outline" onClick={() => setRescheduleSession(item)}>Request reschedule</Button>}</div></CardContent></Card>)}</div>}
      </section>

      <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Enroll in {selectedPackage?.name}</DialogTitle><DialogDescription>Enrollment requires full payment before the lesson package becomes active.</DialogDescription></DialogHeader>
          {selectedPackage && <div className="rounded-lg border p-4"><div className="flex justify-between"><span>Sessions</span><span>{selectedPackage.numberOfSessions}</span></div><div className="mt-2 flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(selectedPackage.price)}</span></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setSelectedPackage(null)}>Cancel</Button><Button disabled={enroll.isPending} onClick={() => enroll.mutate({ lessonPackageId: selectedPackage.id })}>{enroll.isPending ? 'Enrolling…' : 'Enroll & continue to payment'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && setPayment(null)}>
        <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Lesson payment</DialogTitle><DialogDescription>Review your balance and payment history.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="rounded-lg border p-4"><div className="flex justify-between"><span>Total</span><span>{formatCurrency(currentPayment?.totalAmount ?? payment?.amount)}</span></div><div className="mt-2 flex justify-between font-semibold"><span>Balance due</span><span>{formatCurrency(due)}</span></div></div><div className="rounded-lg border p-4"><p className="font-medium">Payment history</p><div className="mt-3 space-y-2">{history.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : unwrap(history.data).length ? unwrap(history.data).map((entry) => <div key={entry.id} className="flex justify-between border-b py-2 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</div></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setPayment(null)}>Close</Button>{due > 0 && <Button onClick={() => checkout.mutate({ id: payment.paymentObligationId, amount: due })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : 'Pay online'}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedEnrollment)} onOpenChange={(open) => !open && setSelectedEnrollment(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Enrollment details</DialogTitle></DialogHeader>{selectedEnrollment && <div className="grid gap-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Package</span><span>{selectedEnrollment.lessonPackage?.name ?? selectedEnrollment.lessonPackageId}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{selectedEnrollment.status}</Badge></div><div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{selectedEnrollment.progress?.completedSessions ?? 0}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span>{selectedEnrollment.progress?.remainingSessions ?? 0}</span></div></div>}</DialogContent></Dialog>

      <Dialog open={Boolean(rescheduleSession)} onOpenChange={(open) => !open && setRescheduleSession(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Request reschedule</DialogTitle><DialogDescription>Tell Cadenza why you cannot attend this session. The front desk can review the request.</DialogDescription></DialogHeader><div className="grid gap-2"><Label>Reason</Label><Textarea value={reason} onChange={(event) => setReason(event.currentTarget.value)} placeholder="Reason for the requested change" /></div><DialogFooter><Button variant="outline" onClick={() => setRescheduleSession(null)}>Cancel</Button><Button disabled={!reason.trim() || requestReschedule.isPending} onClick={() => requestReschedule.mutate({ sessionId: rescheduleSession.id, reason: reason.trim() })}>{requestReschedule.isPending ? 'Submitting…' : 'Submit request'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
