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
import { Textarea } from '../../../components/ui/textarea'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { lessonsApi } from '../../lessons/api/lessons.api'
import { paymentsApi } from '../api/payments.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const customerName = (customer) => {
  const person = customer?.person
  return [person?.firstName, person?.middleName, person?.lastName, person?.suffix]
    .filter(Boolean)
    .join(' ') || person?.email || customer?.id || 'Unknown customer'
}

export default function PaymentsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundPaymentId, setRefundPaymentId] = useState(null)

  const enrollmentsQuery = useQuery({
    queryKey: ['cadenza', 'enrollments'],
    queryFn: lessonsApi.listEnrollments,
  })

  const obligationsQuery = useQuery({
    queryKey: ['cadenza', 'lesson-payment-obligations', unwrap(enrollmentsQuery.data).map((e) => e.paymentObligationId).filter(Boolean).join(',')],
    enabled: !enrollmentsQuery.isLoading,
    queryFn: async () => {
      const enrollments = unwrap(enrollmentsQuery.data)
      return Promise.all(enrollments.filter((e) => e.paymentObligationId).map(async (enrollment) => {
        try {
          const response = await paymentsApi.get(enrollment.paymentObligationId)
          return { enrollment, obligation: unwrap(response) }
        } catch {
          return { enrollment, obligation: null }
        }
      }))
    },
  })

  const historyQuery = useQuery({
    queryKey: ['cadenza', 'payment-history', selected?.obligation?.id],
    queryFn: () => paymentsApi.history(selected.obligation.id),
    enabled: Boolean(selected?.obligation?.id),
  })

  const refund = useMutation({
    mutationFn: ({ paymentId, amount, currency, reason }) =>
      paymentsApi.refund(paymentId, { amount, currency, reason }),
    onSuccess: () => {
      setRefundOpen(false)
      setRefundAmount('')
      setRefundReason('')
      setRefundPaymentId(null)
      client.invalidateQueries({ queryKey: ['cadenza', 'lesson-payment-obligations'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'payment-history', selected?.obligation?.id] })
      client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] })
    },
  })

  if (enrollmentsQuery.isLoading || obligationsQuery.isLoading) return <LoadingState label="Loading lesson payments…" rows={4} />
  if (enrollmentsQuery.error) return <Alert variant="destructive"><AlertDescription>{enrollmentsQuery.error.message}</AlertDescription></Alert>

  const rows = (obligationsQuery.data || []).filter((item) => item.obligation).map(({ enrollment, obligation }) => ({
    ...enrollment,
    obligation,
  }))
  const error = refund.error

  return <div className="grid gap-6">
    <PageHeader title="Lesson Payments" description="Track enrollment obligations, payment history, and refunds." />
    {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
    <Card>
      <CardContent className="pt-6">
        <DataTable
          columns={[
            { key: 'customer', header: 'Customer', value: (row) => customerName(row.customer) },
            { key: 'package', header: 'Package', value: (row) => row.lessonPackage?.name ?? row.lessonPackageId },
            { key: 'total', header: 'Total', value: (row) => formatCurrency(row.obligation.totalAmount) },
            { key: 'paid', header: 'Paid', value: (row) => formatCurrency(row.obligation.netPaidAmount ?? row.obligation.paidAmount) },
            { key: 'balance', header: 'Balance', value: (row) => formatCurrency(row.obligation.balanceDue) },
            { key: 'status', header: 'Status', render: (row) => <Badge variant="secondary">{row.obligation.status}</Badge> },
            { key: 'actions', header: 'Actions', searchable: false, render: (row) => <Button size="sm" variant="outline" onClick={() => setSelected(row)}>Details</Button> },
          ]}
          rows={rows}
          searchPlaceholder="Search lesson payments…"
        />
      </CardContent>
    </Card>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment details</DialogTitle>
          <DialogDescription>{customerName(selected?.customer)} · {selected?.lessonPackage?.name ?? 'Lesson enrollment'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">Total</span><div className="font-medium">{formatCurrency(selected?.obligation?.totalAmount)}</div></div>
            <div><span className="text-muted-foreground">Paid</span><div className="font-medium">{formatCurrency(selected?.obligation?.netPaidAmount ?? selected?.obligation?.paidAmount)}</div></div>
            <div><span className="text-muted-foreground">Balance</span><div className="font-medium">{formatCurrency(selected?.obligation?.balanceDue)}</div></div>
          </div>
          <div className="space-y-2">
            {(unwrap(historyQuery.data)).map((entry) => <div key={entry.id} className="flex items-center justify-between border-b py-2 text-xs"><span>{entry.method ?? entry.provider ?? 'Payment'} · {entry.status}</span><span>{formatCurrency(entry.amount)}</span></div>)}
            {!historyQuery.isLoading && unwrap(historyQuery.data).length === 0 && <p className="text-sm text-muted-foreground">No recorded payments yet.</p>}
          </div>
        </div>
        {can('cadenza_payments:manage') && (selected?.obligation?.netPaidAmount ?? 0) > 0 && <DialogFooter><Button variant="destructive" onClick={() => { const payment = unwrap(historyQuery.data).find((entry) => entry.status === 'SUCCEEDED'); if (!payment) return; setRefundPaymentId(payment.id); setRefundAmount(String(payment.amount)); setRefundOpen(true) }}>Refund payment</Button></DialogFooter>}
      </DialogContent>
    </Dialog>

    <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Refund payment</DialogTitle><DialogDescription>Refund cannot exceed the net amount paid.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label>Amount</Label><Input type="number" min="0.01" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.currentTarget.value)} /></div>
          <div className="grid gap-2"><Label>Reason</Label><Textarea value={refundReason} onChange={(e) => setRefundReason(e.currentTarget.value)} /></div>
        </div>
        <DialogFooter><Button variant="destructive" disabled={!refundAmount || refund.isPending} onClick={() => {
          const payment = unwrap(historyQuery.data).find((entry) => entry.id === refundPaymentId)
          if (!payment) return
          refund.mutate({ paymentId: payment.id, amount: refundAmount, currency: payment.currency, reason: refundReason || undefined })
        }}>{refund.isPending ? 'Refunding…' : 'Confirm refund'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
