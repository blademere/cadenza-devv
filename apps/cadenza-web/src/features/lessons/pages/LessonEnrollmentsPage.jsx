import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import DataTable from '../../../components/data-table'
import LoadingState from '../../../components/loading-state'
import PageHeader from '../../../components/page-header'
import SelectField from '../../../components/select-field'
import { lessonsApi } from '../api/lessons.api'
import { customersApi } from '../../customers/api/customers.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const money = (value) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const personName = (person, fallback = 'Unknown person') => [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || person?.email || fallback

export default function LessonEnrollmentsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canManage = can('cadenza_enrollments:manage')
  const canCreate = can('cadenza_enrollments:create')
  const canPay = can('cadenza_payments:create')
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [payment, setPayment] = useState(null)
  const [form, setForm] = useState({ customerId: '', lessonPackageId: '' })

  const packagesQuery = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })
  const customersQuery = useQuery({ queryKey: ['cadenza', 'customers'], queryFn: customersApi.list, enabled: canManage })
  const enrollmentsQuery = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments, enabled: canCreate || canManage })
  const obligationQuery = useQuery({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId], queryFn: () => paymentsApi.get(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  const historyQuery = useQuery({ queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId], queryFn: () => paymentsApi.history(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })

  const enroll = useMutation({ mutationFn: lessonsApi.enroll, onSuccess: (response) => { setEnrollOpen(false); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }); client.invalidateQueries({ queryKey: ['cadenza', 'customers'] }); const value = response?.data ?? response; if (value?.paymentObligationId) setPayment(value) } })
  const pay = useMutation({ mutationFn: ({ id, amount }) => paymentsApi.pay(id, { amount: String(amount), currency: 'PHP', method: 'CASH' }), onSuccess: () => { client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }); client.invalidateQueries({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId] }); client.invalidateQueries({ queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId] }) } })
  const checkout = useMutation({ mutationFn: ({ id, amount }) => paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza lesson enrollment' }), onSuccess: (response) => { const value = response?.data ?? response; if (value?.checkoutUrl) window.location.assign(value.checkoutUrl) } })

  if (packagesQuery.isLoading || enrollmentsQuery.isLoading || (canManage && customersQuery.isLoading)) return <LoadingState label="Loading enrollments…" rows={5} />
  const error = packagesQuery.error || customersQuery.error || enrollmentsQuery.error || enroll.error || pay.error || checkout.error
  if (error) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
  const packages = unwrap(packagesQuery.data)
  const customers = unwrap(customersQuery.data)
  const enrollments = unwrap(enrollmentsQuery.data)
  const obligation = obligationQuery.data?.data ?? obligationQuery.data
  const due = Number(obligation?.balanceDue ?? obligation?.totalAmount ?? payment?.amount ?? 0)

  return <div className="space-y-6">
    <PageHeader title="Lesson Enrollments" description="Register customers, monitor payment, and review enrollment progress." actions={canManage ? <Button onClick={() => { setForm({ customerId: '', lessonPackageId: '' }); setEnrollOpen(true) }}>Enroll customer</Button> : null} />
    <div className="grid gap-4 sm:grid-cols-3"><Summary label="Enrollments" value={enrollments.length} /><Summary label="Pending payment" value={enrollments.filter((item) => item.status === 'PENDING_PAYMENT').length} /><Summary label="Confirmed" value={enrollments.filter((item) => item.status === 'CONFIRMED').length} /></div>
    <Card><CardContent className="pt-6"><DataTable columns={[
      { key: 'student', header: 'Customer', value: (item) => personName(item.customer?.person, 'Customer') },
      { key: 'package', header: 'Package', value: (item) => item.lessonPackage?.name ?? item.lessonPackageId },
      { key: 'progress', header: 'Progress', value: (item) => `${item.progress?.completedSessions ?? 0}/${item.progress?.totalSessions ?? item.lessonPackage?.numberOfSessions ?? 0}` },
      { key: 'status', header: 'Status', render: (item) => <Badge variant={item.status === 'PENDING_PAYMENT' ? 'outline' : 'secondary'}>{item.status}</Badge> },
      { key: 'actions', header: 'Actions', searchable: false, render: (item) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(item)}>Details</Button>{item.paymentObligationId && canPay && <Button size="sm" onClick={() => setPayment(item)}>{item.status === 'PENDING_PAYMENT' ? 'Payment' : 'History'}</Button>}</div> },
    ]} rows={enrollments} searchPlaceholder="Search customers or lesson packages…" /></CardContent></Card>

    <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}><DialogContent><DialogHeader><DialogTitle>Enroll customer</DialogTitle><DialogDescription>Full payment is required before this enrollment can be scheduled.</DialogDescription></DialogHeader><div className="grid gap-4"><SelectField label="Customer" options={customers.map((item) => ({ value: item.id, label: personName(item.person, 'Customer') }))} value={form.customerId} onChange={(value) => setForm({ ...form, customerId: value || '' })} placeholder="Choose a customer" /><SelectField label="Package" options={packages.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))} value={form.lessonPackageId} onChange={(value) => setForm({ ...form, lessonPackageId: value || '' })} placeholder="Choose a package" /></div><DialogFooter><Button disabled={!form.customerId || !form.lessonPackageId || enroll.isPending} onClick={() => enroll.mutate(form)}>{enroll.isPending ? 'Creating…' : 'Create enrollment'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{selected?.lessonPackage?.name ?? 'Lesson enrollment'}</DialogTitle><DialogDescription>Enrollment status, progress, and scheduled sessions.</DialogDescription></DialogHeader>{selected && <div className="grid gap-5"><div className="grid gap-3 sm:grid-cols-3"><Stat label="Status" value={selected.status} /><Stat label="Progress" value={`${selected.progress?.completedSessions ?? 0}/${selected.progress?.totalSessions ?? selected.lessonPackage?.numberOfSessions ?? 0}`} /><Stat label="Customer" value={personName(selected.customer?.person, 'Customer')} /></div><div><h3 className="text-sm font-semibold">Scheduled sessions</h3><div className="mt-2 grid gap-2">{(selected.sessions ?? []).length ? selected.sessions.map((session) => <div key={session.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{session.scheduledStart ? new Date(session.scheduledStart).toLocaleString() : 'Schedule pending'}</p><p className="text-xs text-muted-foreground">{personName(session.instructor?.person, 'Instructor unassigned')} · {session.room?.name ?? 'Room unassigned'}</p></div><div className="flex gap-2"><Badge variant="secondary">{session.status}</Badge>{session.attendance?.status && <Badge variant="outline">{session.attendance.status}</Badge>}</div></div>) : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No sessions scheduled yet.</p>}</div></div></div>}</DialogContent></Dialog>

    <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && setPayment(null)}><DialogContent><DialogHeader><DialogTitle>Enrollment payment</DialogTitle><DialogDescription>Review payment history or settle the outstanding balance.</DialogDescription></DialogHeader><div className="grid gap-4"><div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Amount due</p><p className="mt-1 text-2xl font-bold">{money(due)}</p></div><div className="grid gap-2">{(historyQuery.data?.data ?? historyQuery.data ?? []).map((entry) => <div key={entry.id} className="flex justify-between border-b py-2 text-xs last:border-0"><span>{new Date(entry.createdAt).toLocaleString()}</span><span>{money(entry.amount)} · {entry.status}</span></div>)}</div>{payment?.status === 'PENDING_PAYMENT' && canPay && <div className="grid gap-2 sm:grid-cols-2"><Button disabled={!due || pay.isPending} onClick={() => pay.mutate({ id: payment.paymentObligationId, amount: due })}>{pay.isPending ? 'Recording…' : 'Pay at front desk'}</Button><Button variant="outline" disabled={!due || checkout.isPending} onClick={() => checkout.mutate({ id: payment.paymentObligationId, amount: due })}>{checkout.isPending ? 'Opening…' : 'Pay online'}</Button></div>}</div></DialogContent></Dialog>
  </div>
}
function Summary({ label, value }) { return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card> }
function Stat({ label, value }) { return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div> }
