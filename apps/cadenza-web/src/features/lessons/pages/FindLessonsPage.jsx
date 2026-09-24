import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { lessonsApi } from '../api/lessons.api'
import { paymentsApi } from '../../payments/api/payments.api'

const unwrap = (value) => value?.data ?? value ?? []

export default function FindLessonsPage() {
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [payment, setPayment] = useState(null)

  const packages = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })
  const enrollments = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments })
  const obligation = useQuery({
    queryKey: ['cadenza', 'payment', payment?.paymentObligationId],
    queryFn: () => paymentsApi.get(payment.paymentObligationId),
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

  if (packages.isLoading || enrollments.isLoading) return <LoadingState label="Loading lessons…" rows={5} />
  const error = packages.error || enrollments.error || enroll.error || checkout.error
  if (error) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>

  const enrolledPackageIds = new Set(unwrap(enrollments.data).map((item) => item.lessonPackageId))
  const rows = unwrap(packages.data)
    .filter((item) => item.status === 'ACTIVE')
    .filter((item) => {
      const term = search.trim().toLowerCase()
      return !term || [item.name, item.description].filter(Boolean).some((value) => value.toLowerCase().includes(term))
    })

  return (
    <div className="space-y-6">
      <PageHeader title="Find Lessons" description="Discover available lesson packages and enroll in the program that fits you." />
      <div className="max-w-xl">
        <Input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search lessons by name or description…" aria-label="Search lessons" />
      </div>
      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{search ? 'No lesson packages match your search.' : 'No lesson packages are currently available.'}</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const enrolled = enrolledPackageIds.has(item.id)
            return (
              <Card key={item.id} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div><CardTitle className="text-base">{item.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.numberOfSessions} sessions</p></div>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="min-h-12 text-sm text-muted-foreground">{item.description || 'Music lesson package'}</p>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div><p className="text-xs text-muted-foreground">Package price</p><p className="text-xl font-bold">{formatCurrency(item.price)}</p></div>
                    <Button disabled={enrolled} onClick={() => setSelectedPackage(item)}>{enrolled ? 'Enrolled' : 'Enroll'}</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Enroll in {selectedPackage?.name}</DialogTitle><DialogDescription>Enrollment requires full payment before the lesson package becomes active.</DialogDescription></DialogHeader>
          {selectedPackage && <div className="rounded-lg border p-4"><div className="flex justify-between"><span>Sessions</span><span>{selectedPackage.numberOfSessions}</span></div><div className="mt-2 flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(selectedPackage.price)}</span></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setSelectedPackage(null)}>Cancel</Button><Button disabled={enroll.isPending} onClick={() => enroll.mutate({ lessonPackageId: selectedPackage.id })}>{enroll.isPending ? 'Enrolling…' : 'Enroll & continue to payment'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && setPayment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Complete lesson payment</DialogTitle><DialogDescription>Your enrollment is pending until the full package amount is paid.</DialogDescription></DialogHeader>
          {payment && <PaymentSummary obligation={unwrap(obligation.data)} payment={payment} />}
          <DialogFooter><Button variant="outline" onClick={() => setPayment(null)}>Later</Button>{payment && <Button onClick={() => checkout.mutate({ id: payment.paymentObligationId, amount: Number(unwrap(obligation.data)?.balanceDue ?? payment.amount ?? 0) })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : 'Pay full amount'}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PaymentSummary({ obligation, payment }) {
  const due = Number(obligation?.balanceDue ?? payment?.amount ?? 0)
  return <div className="rounded-lg border p-4"><div className="flex justify-between"><span>Total</span><span>{formatCurrency(obligation?.totalAmount ?? payment?.amount)}</span></div><div className="mt-2 flex justify-between font-semibold"><span>Balance due</span><span>{formatCurrency(due)}</span></div></div>
}
