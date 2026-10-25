import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, QrCode } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import roomBookingService from '../services/roomBookingsService'
import PaymentAccountInstructions from '../../components/PaymentAccountInstructions'

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function RoomBookingPaymentPage() {
  const navigate = useNavigate()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  const checkout = useMemo(() => {
    try {
      const stored = localStorage.getItem('cadenza-pending-room-checkout')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [])

  const room = checkout?.room
  const start = checkout
    ? new Date(`${checkout.date}T${checkout.startTime}:00+08:00`)
    : null
  const end = checkout
    ? new Date(`${checkout.date}T${checkout.endTime}:00+08:00`)
    : null
  const durationHours =
    start && end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0
  const rateDurationHours = Number(room?.rentalDurationHours)
  const totalAmount =
    Number.isFinite(durationHours) && durationHours > 0 &&
    Number.isFinite(rateDurationHours) && rateDurationHours > 0
      ? Number(room?.rentalRate || 0) * Math.ceil(durationHours / rateDurationHours)
      : 0
  const amountDue =
    checkout?.paymentPlan === 'DOWN_PAYMENT'
      ? totalAmount * 0.5
      : totalAmount

  const handlePay = async () => {
    if (!checkout?.room?.id || !checkout?.paymentPlan) {
      setError('No pending room booking was found.')
      return
    }
    if (!start || !end || !Number.isFinite(durationHours) || durationHours < 1 ||
        !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
        !Number.isFinite(rateDurationHours) || rateDurationHours <= 0 ||
        !Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError('Invalid booking schedule or room rate. Please select your room again.')
      return
    }
    if (paymentReference.trim().length < 3) {
      setError('Enter the payment reference before continuing.')
      return
    }

    try {
      setPaying(true)
      setError('')

      const booking = await roomBookingService.createRoomBooking({
        roomId: checkout.room.id,
        paymentPlan: checkout.paymentPlan,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        paymentMethod: 'GCASH',
        paymentReference: paymentReference.trim(),
      })

      localStorage.removeItem('cadenza-pending-room-checkout')

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'CADENZA_ROOM_PAYMENT_COMPLETED',
            bookingId: booking.id,
          },
          window.location.origin,
        )
        window.close()
      } else {
        navigate(`/client/room-bookings/${booking.id}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to process payment.')
      setPaying(false)
    }
  }

  if (!checkout?.room) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-destructive">No pending payment was found.</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-2xl rounded-2xl border bg-card p-6 text-center shadow-lg sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Scan to Pay</h1>
        <p className="mt-2 text-sm text-muted-foreground">Band room booking</p>
        <PaymentAccountInstructions selectedAccountId={checkout?.paymentAccountId} />
        <p className="mt-5 text-sm text-muted-foreground">
          Amount due: <span className="font-semibold text-foreground">{formatCurrency(amountDue)}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Online payment is not connected yet. Click Pay to submit this booking
          for front desk confirmation.
        </p>
        <label className="mt-5 block text-left text-sm font-medium">
          Scan to Pay reference
          <input
            type="text"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
            placeholder="Enter the GCash reference number"
            maxLength={100}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handlePay}
          disabled={paying}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {paying ? 'Paying...' : 'Pay'}
        </button>
      </section>
    </main>
  )
}
