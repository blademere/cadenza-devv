import { ArrowLeft, CheckCircle, Clock, CreditCard, XCircle } from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import LoadingState from '../../../components/loading-state'
import PageHeader from '../../../components/page-header'
import { formatCurrency } from '../../../utils/currency'
import { paymentsApi } from '../api/payments.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? null

const referenceLabel = (type) => {
  if (type === 'CADENZA_ENROLLMENT') return 'Music lesson enrollment'
  if (type === 'CADENZA_RENTAL') return 'Rental booking'
  return 'Payment'
}

export default function PaymentPage() {
  const navigate = useNavigate()
  const { obligationId: routeObligationId } = useParams()
  const [searchParams] = useSearchParams()
  const { can } = useAuthorization()
  const obligationId = routeObligationId || searchParams.get('obligationId')
  const result = searchParams.get('result')
  const canPay = can('cadenza_payments:create')

  const checkout = useMutation({
    mutationFn: ({ amount, description }) => paymentsApi.checkout(obligationId, { amount: String(amount), description }),
    onSuccess: (response) => {
      const value = unwrap(response)
      if (value?.checkoutUrl) window.location.assign(value.checkoutUrl)
    },
  })

  const obligationQuery = useQuery({
    queryKey: ['cadenza', 'payment-page', obligationId],
    queryFn: () => paymentsApi.get(obligationId),
    enabled: Boolean(obligationId),
    refetchInterval: (query) => {
      const value = unwrap(query.state.data)
      return value?.status === 'PAID' ? false : 2500
    },
  })

  const historyQuery = useQuery({
    queryKey: ['cadenza', 'payment-page-history', obligationId],
    queryFn: () => paymentsApi.history(obligationId),
    enabled: Boolean(obligationId),
    refetchInterval: obligationQuery.isFetching ? 2500 : false,
  })

  if (!obligationId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Payment reference missing</AlertTitle>
        <AlertDescription>This payment page needs a payment obligation reference.</AlertDescription>
      </Alert>
    )
  }

  if (obligationQuery.isLoading) return <LoadingState label="Loading payment…" rows={4} />

  if (obligationQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load payment</AlertTitle>
        <AlertDescription>{obligationQuery.error.message}</AlertDescription>
      </Alert>
    )
  }

  const obligation = unwrap(obligationQuery.data)
  const balance = Number(obligation?.balanceDue ?? 0)
  const history = unwrap(historyQuery.data) || []
  const paid = Number(obligation?.netPaidAmount ?? obligation?.paidAmount ?? 0)
  const isPaid = obligation?.status === 'PAID'
  const isPartiallyPaid = obligation?.status === 'PARTIALLY_PAID'
  const isFailure = result === 'failure'
  const isReturn = result === 'success' || result === 'failure'
  const title = isPaid ? 'Payment complete' : isPartiallyPaid ? 'Payment received' : isFailure ? 'Payment not completed' : 'Complete your payment'
  const description = isPaid
    ? obligation.referenceType === 'CADENZA_ENROLLMENT'
      ? 'Your lesson enrollment has been confirmed.'
      : 'Your payment has been recorded successfully.'
    : isPartiallyPaid
      ? 'Your payment has been received. Any remaining balance is shown below.'
      : isFailure
        ? 'The payment provider returned you without a completed payment. You can review the balance and try again.'
        : isReturn
          ? 'We are waiting for the server-side payment confirmation. This page refreshes automatically.'
          : 'Review the amount due and continue to secure your Cadenza booking.'

  const backTo = obligation.referenceType === 'CADENZA_ENROLLMENT' ? '/app/lessons' : '/app/rentals'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={(
          <Button variant="outline" onClick={() => navigate(backTo)}>
            <ArrowLeft size={16} />
            Back to {obligation.referenceType === 'CADENZA_ENROLLMENT' ? 'Lessons' : 'Rentals'}
          </Button>
        )}
      />

      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
              {isPaid || isPartiallyPaid ? <CheckCircle size={28} weight="fill" /> : isFailure ? <XCircle size={28} weight="fill" /> : <Clock size={28} weight="fill" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{referenceLabel(obligation.referenceType)}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{formatCurrency(obligation.totalAmount)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={isPaid ? 'default' : 'secondary'}>{obligation.status}</Badge>
                {obligation.currency && <Badge variant="outline">{obligation.currency}</Badge>}
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-right">
            <p className="text-xs text-muted-foreground">Balance due</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(balance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Paid {formatCurrency(paid)}</p>
          </div>
        </CardContent>
      </Card>

      {isReturn && !isPaid && !isPartiallyPaid && (
        <Alert>
          <Clock size={18} />
          <AlertTitle>Payment confirmation pending</AlertTitle>
          <AlertDescription>
            The return URL is not treated as proof of payment. Cadenza waits for the verified server-side payment notification before changing the payment obligation.
          </AlertDescription>
        </Alert>
      )}

      {isPaid && (
        <Alert>
          <CheckCircle size={18} />
          <AlertTitle>Payment verified</AlertTitle>
          <AlertDescription>The payment has been recorded by Cadenza and the linked workflow can continue.</AlertDescription>
        </Alert>
      )}

      {!isPaid && canPay && balance > 0 && !isFailure && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Continue with online payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => checkout.mutate({ amount: balance, description: referenceLabel(obligation.referenceType) })} disabled={checkout.isPending}>
              <CreditCard size={18} />
              {checkout.isPending ? 'Opening secure checkout…' : 'Continue to secure checkout'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment history…</p>
          ) : history.length ? (
            <div className="divide-y rounded-lg border">
              {history.map((entry) => (
                <div key={entry.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium">{entry.method || entry.provider || 'Payment'}</p>
                    <p className="text-xs text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold">{formatCurrency(entry.amount)}</p>
                    <Badge variant="outline" className="mt-1">{entry.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No completed payments have been recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
