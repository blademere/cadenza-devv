import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { lessonsApi } from '../api/lessons.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { schedulingApi } from '../../scheduling/api/scheduling.api'

const unwrap = (value) => value?.data ?? value ?? []

export default function MyLessonsPage() {
  const client = useQueryClient()
  const [payment, setPayment] = useState(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)
  const [rescheduleSession, setRescheduleSession] = useState(null)
  const [reason, setReason] = useState('')

  const enrollments = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments })
  const sessions = useQuery({ queryKey: ['cadenza', 'customer', 'sessions'], queryFn: schedulingApi.listSessions })
  const obligation = useQuery({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId], queryFn: () => paymentsApi.get(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  const history = useQuery({ queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId], queryFn: () => paymentsApi.history(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  const checkout = useMutation({
    mutationFn: ({ id, amount }) => paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza lesson enrollment' }),
    onSuccess: (response) => { const value = unwrap(response); if (value?.checkoutUrl) window.location.assign(value.checkoutUrl) },
  })
  const requestReschedule = useMutation({
    mutationFn: schedulingApi.requestReschedule,
    onSuccess: () => { setRescheduleSession(null); setReason(''); client.invalidateQueries({ queryKey: ['cadenza', 'customer', 'sessions'] }) },
  })

  if (enrollments.isLoading || sessions.isLoading) return <LoadingState label="Loading your lessons…" rows={5} />
  const error = enrollments.error || sessions.error || checkout.error || requestReschedule.error
  if (error) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>

  const activeEnrollments = unwrap(enrollments.data).filter((item) => ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'].includes(item.status))
  const upcoming = unwrap(sessions.data).filter((item) => !['COMPLETED', 'CANCELLED', 'MISSED'].includes(item.status))

  return (
    <div className="space-y-6">
      <PageHeader title="My Lessons" description="Manage your active enrollments, upcoming sessions, payments, and rescheduling." />
      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Active enrollments</h2><p className="text-sm text-muted-foreground">Your current lesson programs and remaining sessions.</p></div>
        {activeEnrollments.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">You do not have any active lesson enrollments.</CardContent></Card> :
          <div className="grid gap-3">{activeEnrollments.map((item) => {
            const pending = item.status === 'PENDING_PAYMENT' && item.paymentObligationId
            return <Card key={item.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.lessonPackage?.name ?? item.lessonPackageId}</p><Badge variant={pending ? 'outline' : 'secondary'}>{item.status}</Badge></div><p className="text-sm text-muted-foreground">{item.progress?.completedSessions ?? 0}/{item.progress?.totalSessions ?? item.lessonPackage?.numberOfSessions ?? 0} sessions completed · {item.progress?.remainingSessions ?? 0} remaining</p></div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedEnrollment(item)}>Details</Button>{pending && <Button size="sm" onClick={() => setPayment(item)}>Pay now</Button>}{!pending && item.paymentObligationId && <Button size="sm" variant="outline" onClick={() => setPayment(item)}>Payments</Button>}</div>
            </CardContent></Card>
          })}</div>}
      </section>
      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Upcoming sessions</h2><p className="text-sm text-muted-foreground">Only future and active sessions appear here. Completed lessons belong in Lesson History.</p></div>
        {upcoming.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No upcoming lessons scheduled.</CardContent></Card> :
          <div className="grid gap-3">{upcoming.map((item) => <Card key={item.id}><CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{item.enrollment?.lessonPackage?.name ?? 'Music lesson'}</p><p className="text-sm text-muted-foreground">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : 'Schedule pending'} · {item.room?.name ?? item.room?.resource?.name ?? 'Room pending'}</p><p className="text-sm text-muted-foreground">Instructor: {item.instructor?.person?.fullName ?? item.instructor?.person?.firstName ?? 'Assigned by Cadenza'}</p></div><div className="flex items-center gap-2"><Badge variant="secondary">{item.attendance?.status ?? item.status}</Badge>{['SCHEDULED','RESERVED'].includes(item.status) && <Button size="sm" variant="outline" onClick={() => setRescheduleSession(item)}>Reschedule</Button>}</div></CardContent></Card>)}</div>}
      </section>
      <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && setPayment(null)}>
        <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Lesson payments</DialogTitle><DialogDescription>Review your balance and payment history for this enrollment.</DialogDescription></DialogHeader>
          {payment && <div className="space-y-4"><div className="rounded-lg border p-4"><div className="flex justify-between"><span>Total</span><span>{formatCurrency(unwrap(obligation.data)?.totalAmount ?? payment.amount)}</span></div><div className="mt-2 flex justify-between font-semibold"><span>Balance due</span><span>{formatCurrency(unwrap(obligation.data)?.balanceDue ?? payment.amount ?? 0)}</span></div></div><div className="rounded-lg border p-4"><p className="font-medium">Payment history</p><div className="mt-3 space-y-2">{history.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : unwrap(history.data).length ? unwrap(history.data).map((entry) => <div key={entry.id} className="flex justify-between border-b py-2 text-sm"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}</div></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setPayment(null)}>Close</Button>{payment && Number(unwrap(obligation.data)?.balanceDue ?? payment.amount ?? 0) > 0 && <Button onClick={() => checkout.mutate({ id: payment.paymentObligationId, amount: Number(unwrap(obligation.data)?.balanceDue ?? payment.amount) })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : 'Pay online'}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedEnrollment)} onOpenChange={(open) => !open && setSelectedEnrollment(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Enrollment details</DialogTitle></DialogHeader>{selectedEnrollment && <div className="grid gap-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Package</span><span>{selectedEnrollment.lessonPackage?.name ?? selectedEnrollment.lessonPackageId}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{selectedEnrollment.status}</Badge></div><div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{selectedEnrollment.progress?.completedSessions ?? 0}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span>{selectedEnrollment.progress?.remainingSessions ?? 0}</span></div></div>}</DialogContent></Dialog>
      <Dialog open={Boolean(rescheduleSession)} onOpenChange={(open) => !open && setRescheduleSession(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Request reschedule</DialogTitle><DialogDescription>Tell Cadenza why you cannot attend this session. The front desk can review the request.</DialogDescription></DialogHeader><div className="grid gap-2"><Label>Reason</Label><Textarea value={reason} onChange={(event) => setReason(event.currentTarget.value)} placeholder="Reason for the requested change" /></div><DialogFooter><Button variant="outline" onClick={() => setRescheduleSession(null)}>Cancel</Button><Button disabled={!reason.trim() || requestReschedule.isPending} onClick={() => requestReschedule.mutate({ sessionId: rescheduleSession.id, reason: reason.trim() })}>{requestReschedule.isPending ? 'Submitting…' : 'Submit request'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
