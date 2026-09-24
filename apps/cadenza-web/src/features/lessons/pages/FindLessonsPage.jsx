import { useMemo, useState } from 'react'
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
  const rows = useMemo(() => unwrap(packages.data)
    .filter((item) => item.status === 'ACTIVE')
    .filter((item) => {
      const term = search.trim().toLowerCase()
      return !term || [item.name, item.description].filter(Boolean).some((value) => value.toLowerCase().includes(term))
    }), [packages.data, search])

  return (
    <div className="space-y-6">
      <PageHeader title="Find Lessons" description="Explore lesson programs, compare what is included, and enroll when you are ready." />

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold">Find your next lesson program</p>
            <p className="mt-1 text-sm text-muted-foreground">Choose a package based on session count, price, and what you want to learn.</p>
          </div>
          <div className="w-full md:max-w-sm">
            <Input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search programs…" aria-label="Search lesson programs" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">Available programs</h2><p className="text-sm text-muted-foreground">{rows.length} program{rows.length === 1 ? '' : 's'} available</p></div>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-14 text-center"><p className="font-medium">{search ? 'No programs match your search' : 'No lesson programs are available right now'}</p><p className="mt-1 text-sm text-muted-foreground">{search ? 'Try another name or description.' : 'Check back later for new programs.'}</p></CardContent></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const enrolled = enrolledPackageIds.has(item.id)
            return (
              <Card key={item.id} className="group flex h-full flex-col transition-shadow hover:shadow-md">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="secondary">Lesson program</Badge>
                    {enrolled && <Badge>Enrolled</Badge>}
                  </div>
                  <div><CardTitle className="text-xl">{item.name}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{item.description || 'A structured music lesson program.'}</p></div>
                </CardHeader>
                <CardContent className="mt-auto space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoStat label="Sessions" value={item.numberOfSessions ?? '—'} />
                    <InfoStat label="Program price" value={formatCurrency(item.price)} />
                  </div>
                  <Button className="w-full" disabled={enrolled} onClick={() => setSelectedPackage(item)}>{enrolled ? 'Already enrolled' : 'View program & enroll'}</Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedPackage?.name}</DialogTitle><DialogDescription>Review the program before starting enrollment.</DialogDescription></DialogHeader>
          {selectedPackage && (
            <div className="space-y-5">
              <div className="rounded-xl border p-5"><p className="text-sm text-muted-foreground">{selectedPackage.description || 'Music lesson program'}</p><div className="mt-5 grid grid-cols-2 gap-4"><InfoStat label="Sessions" value={selectedPackage.numberOfSessions ?? '—'} /><InfoStat label="Full price" value={formatCurrency(selectedPackage.price)} /></div></div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm"><p className="font-medium">Payment</p><p className="mt-1 text-muted-foreground">Enrollment requires the full package amount. You will continue to checkout after enrollment is created.</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setSelectedPackage(null)}>Back</Button><Button disabled={enroll.isPending} onClick={() => enroll.mutate({ lessonPackageId: selectedPackage.id })}>{enroll.isPending ? 'Starting enrollment…' : 'Enroll & continue'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && setPayment(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Complete your enrollment</DialogTitle><DialogDescription>Your place is pending until the lesson program is fully paid.</DialogDescription></DialogHeader>
          {payment && <PaymentSummary obligation={unwrap(obligation.data)} payment={payment} />}
          <DialogFooter><Button variant="outline" onClick={() => setPayment(null)}>Pay later</Button>{payment && <Button onClick={() => checkout.mutate({ id: payment.paymentObligationId, amount: Number(unwrap(obligation.data)?.balanceDue ?? payment.amount ?? 0) })} disabled={checkout.isPending}>{checkout.isPending ? 'Opening checkout…' : 'Pay full amount'}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoStat({ label, value }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}

function PaymentSummary({ obligation, payment }) {
  const due = Number(obligation?.balanceDue ?? payment?.amount ?? 0)
  return <div className="rounded-xl border p-5"><div className="flex justify-between text-sm"><span>Total</span><span>{formatCurrency(obligation?.totalAmount ?? payment?.amount)}</span></div><div className="mt-3 flex justify-between text-lg font-semibold"><span>Balance due</span><span>{formatCurrency(due)}</span></div></div>
}
