import { useMemo, useState } from 'react'
import { CheckCircle2Icon, Loader2Icon, QrCodeIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { createInstrumentRental } from '../services/instrument-rental.service'
import PaymentAccountInstructions from '../../components/PaymentAccountInstructions'

export default function RentalPaymentPage() {
  const navigate = useNavigate()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  const checkout = useMemo(() => {
    try {
      const stored = localStorage.getItem(
        'cadenza-pending-rental-checkout',
      )
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [])

  const items = Array.isArray(checkout?.items) ? checkout.items : []

  const handlePay = async () => {
    if (!items.length || !checkout?.paymentPlan) {
      setError('No pending payment was found.')
      return
    }
    if (paymentReference.trim().length < 3) {
      setError('Enter the payment reference number before continuing.')
      return
    }

    try {
      setPaying(true)
      setError('')

      const createdRentals = await Promise.all(
        items.map(({ instrument, schedule }) =>
          createInstrumentRental({
            rentalType: 'INDIVIDUAL',
            instrumentId: instrument.id,
            paymentPlan: checkout.paymentPlan,
            paymentReference: paymentReference.trim(),
            scheduledStart: new Date(schedule.start).toISOString(),
            scheduledEnd: new Date(schedule.end).toISOString(),
          }),
        ),
      )

      const purchasedInstrumentIds = new Set(
        items.map(({ instrument }) => instrument.id),
      )

      try {
        const storedCart = localStorage.getItem(
          'cadenza-instrument-rental-cart',
        )
        const cart = storedCart ? JSON.parse(storedCart) : []
        const remainingCart = Array.isArray(cart)
          ? cart.filter((instrument) => !purchasedInstrumentIds.has(instrument.id))
          : []

        localStorage.setItem(
          'cadenza-instrument-rental-cart',
          JSON.stringify(remainingCart),
        )
      } catch {
        // The rental was created successfully even if cart cleanup fails.
      }

      localStorage.removeItem('cadenza-pending-rental-checkout')

      const rentalId = createdRentals[0].id

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'CADENZA_RENTAL_PAYMENT_COMPLETED',
            rentalId,
          },
          window.location.origin,
        )
        window.close()
      } else {
        navigate(`/client/instrument-rentals/${rentalId}`, {
          replace: true,
        })
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to process payment.')
      setPaying(false)
    }
  }

  if (!items.length) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-destructive">
          No pending payment was found.
        </p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-2xl rounded-2xl border bg-card p-6 text-center shadow-lg sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCodeIcon className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">Scan to Pay</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Instrument rental payment
        </p>

        <PaymentAccountInstructions />

        <div className="mt-5 text-left">
          <label htmlFor="rental-payment-reference" className="text-sm font-medium">
            Payment reference number
          </label>
          <input
            id="rental-payment-reference"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            placeholder="Enter the reference from your payment receipt"
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            This reference will be checked by the front desk.
          </p>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Online payment is not connected yet. Click Pay to submit this rental
          request for front desk confirmation.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={paying || paymentReference.trim().length < 3}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2Icon className="h-4 w-4" />
          )}
          {paying ? 'Paying...' : 'Pay'}
        </button>
      </section>
    </main>
  )
}
