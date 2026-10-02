import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  Loader2Icon,
  ShoppingCartIcon,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  checkInstrumentAvailability,
  getInstrument,
} from '../services/instrument-rental.service'

const MINIMUM_RENTAL_HOURS = 8

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const getName = (instrument) =>
  instrument?.name ||
  [instrument?.brand, instrument?.model].filter(Boolean).join(' ') || 'Instrument'

const getDurationHours = (schedule) => {
  if (!schedule?.start || !schedule?.end) return 0

  const start = new Date(schedule.start)
  const end = new Date(schedule.end)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 0
  }

  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

const getEstimate = (instrument, schedule) => {
  const durationHours = getDurationHours(schedule)
  const billableHours = durationHours
    ? Math.max(MINIMUM_RENTAL_HOURS, Math.ceil(durationHours))
    : 0
  const hourlyRate = Number(instrument?.rentalRate || 0) / MINIMUM_RENTAL_HOURS

  return {
    durationHours,
    billableHours,
    hourlyRate,
    total: hourlyRate * billableHours,
  }
}

export default function CreateInstrumentRental() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const instrumentIds = useMemo(
    () =>
      (
        searchParams.get('instruments') ||
        searchParams.get('instrument') ||
        ''
      )
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    [searchParams],
  )

  const [instruments, setInstruments] = useState([])
  const [schedules, setSchedules] = useState({})
  const [availability, setAvailability] = useState({})
  const [checkingId, setCheckingId] = useState(null)
  const [paymentPlan, setPaymentPlan] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadInstruments = async () => {
      if (!instrumentIds.length) {
        setError('No instruments were selected.')
        setLoading(false)
        return
      }

      try {
        const data = await Promise.all(
          instrumentIds.map((id) => getInstrument(id)),
        )

        setInstruments(data)
        setSchedules(
          Object.fromEntries(
            data.map((instrument) => [
              instrument.id,
              { start: '', end: '' },
            ]),
          ),
        )
      } catch (requestError) {
        setError(
          requestError?.message || 'Unable to load the selected instruments.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadInstruments()
  }, [instrumentIds.join(',')])

  useEffect(() => {
    const handlePaymentComplete = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== 'CADENZA_RENTAL_PAYMENT_COMPLETED' ||
        !event.data?.rentalId
      ) {
        return
      }

      setSubmitting(false)
      navigate(`/client/instrument-rentals/${event.data.rentalId}`)
    }

    window.addEventListener('message', handlePaymentComplete)

    return () => {
      window.removeEventListener('message', handlePaymentComplete)
    }
  }, [navigate])

  const updateSchedule = (id, field, value) => {
    setSchedules((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }))

    setAvailability((current) => ({
      ...current,
      [id]: null,
    }))
    setError('')
  }

  const checkAvailability = async (instrument) => {
    const schedule = schedules[instrument.id]
    const durationHours = getDurationHours(schedule)

    if (durationHours < MINIMUM_RENTAL_HOURS) {
      setError(
        `${getName(instrument)} requires a minimum rental period of 8 hours.`,
      )
      return false
    }

    try {
      setCheckingId(instrument.id)
      setError('')

      const data = await checkInstrumentAvailability({
        scheduledStart: new Date(schedule.start).toISOString(),
        scheduledEnd: new Date(schedule.end).toISOString(),
      })

      const isAvailable = Array.isArray(data)
        ? data.some((item) => item.id === instrument.id)
        : data?.id === instrument.id

      setAvailability((current) => ({
        ...current,
        [instrument.id]: isAvailable,
      }))

      if (!isAvailable) {
        setError(`${getName(instrument)} is not available for this schedule.`)
      }

      return isAvailable
    } catch (requestError) {
      setAvailability((current) => ({
        ...current,
        [instrument.id]: false,
      }))
      setError(
        requestError?.message ||
          `Unable to check ${getName(instrument)} availability.`,
      )
      return false
    } finally {
      setCheckingId(null)
    }
  }

  const submitRentals = async () => {
    setError('')

    for (const instrument of instruments) {
      const schedule = schedules[instrument.id]
      const durationHours = getDurationHours(schedule)

      if (durationHours < MINIMUM_RENTAL_HOURS) {
        setError(
          `${getName(instrument)} must have a schedule of at least 8 hours.`,
        )
        return
      }

      if (availability[instrument.id] !== true) {
        const isAvailable = await checkAvailability(instrument)
        if (!isAvailable) return
      }
    }

    try {
      setSubmitting(true)

      localStorage.setItem(
        'cadenza-pending-rental-checkout',
        JSON.stringify({
          paymentPlan,
          items: instruments.map((instrument) => ({
            instrument,
            schedule: schedules[instrument.id],
          })),
        }),
      )

      const paymentWindow = window.open(
        `${window.location.origin}/client/instrument-rentals/payment`,
        '_blank',
      )

      if (!paymentWindow) {
        setError(
          'The payment tab was blocked. Please allow popups for this site and try again.',
        )
      }
    } catch (requestError) {
      setError(
        requestError?.errors?.length
          ? requestError.errors
              .map((item) => item.message || item.path)
              .join(' ')
          : requestError?.message ||
            'Unable to create the rental requests.',
      )
      setSubmitting(false)
    }
  }

  const totalEstimate = instruments.reduce(
    (total, instrument) =>
      total + getEstimate(instrument, schedules[instrument.id]).total,
    0,
  )

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="h-5 w-5 animate-spin" />
        Loading cart...
      </div>
    )
  }

  if (!instruments.length) {
    return (
      <div className="space-y-6 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate('/client/instrument-rentals')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Instrument Rentals
        </button>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {error || 'No instruments were selected.'}
        </div>
      </div>
    )
  }

  return (
    <main className="space-y-6 px-4 py-6 lg:px-6">
      <button
        type="button"
        onClick={() => navigate('/client/instrument-rentals')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Instrument Rentals
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShoppingCartIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Rental Cart
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Set a separate schedule for each selected instrument.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-sm shadow-sm">
          <span className="text-muted-foreground">Items in cart</span>
          <span className="ml-3 font-semibold">{instruments.length}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {instruments.map((instrument) => {
            const schedule = schedules[instrument.id] || {}
            const estimate = getEstimate(instrument, schedule)
            const isAvailable = availability[instrument.id] === true

            return (
              <section
                key={instrument.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">
                      Rental item
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {getName(instrument)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {[instrument.brand, instrument.model]
                        .filter(Boolean)
                        .join(' ') || 'Instrument'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2 text-right text-sm">
                    <p className="text-xs text-muted-foreground">Base rate</p>
                    <p className="font-semibold">
                      {formatCurrency(instrument.rentalRate)} / 8 hours
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Start date & time
                    <input
                      type="datetime-local"
                      value={schedule.start || ''}
                      onChange={(event) =>
                        updateSchedule(
                          instrument.id,
                          'start',
                          event.target.value,
                        )
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    End date & time
                    <input
                      type="datetime-local"
                      value={schedule.end || ''}
                      onChange={(event) =>
                        updateSchedule(
                          instrument.id,
                          'end',
                          event.target.value,
                        )
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    <span>
                      Duration:{' '}
                      {estimate.durationHours
                        ? `${estimate.durationHours.toFixed(2)} hours`
                        : '—'}
                    </span>
                    <span>
                      Billable:{' '}
                      {estimate.billableHours
                        ? `${estimate.billableHours} hours`
                        : '—'}
                    </span>
                    <span>
                      Estimate: {formatCurrency(estimate.total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => checkAvailability(instrument)}
                    disabled={checkingId === instrument.id}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-3 py-2 font-medium hover:bg-accent disabled:opacity-60"
                  >
                    {checkingId === instrument.id ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : isAvailable ? (
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CalendarDaysIcon className="h-4 w-4" />
                    )}
                    {isAvailable ? 'Available' : 'Check availability'}
                  </button>
                </div>
              </section>
            )
          })}
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Order summary</h2>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            {instruments.map((instrument) => (
              <div key={instrument.id} className="flex justify-between gap-4">
                <span className="truncate text-muted-foreground">
                  {getName(instrument)}
                </span>
                <span className="shrink-0 font-medium">
                  {formatCurrency(
                    getEstimate(instrument, schedules[instrument.id]).total,
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t pt-4 font-semibold">
            <span>Estimated total</span>
            <span>{formatCurrency(totalEstimate)}</span>
          </div>
          <div className="mt-6 border-t pt-5">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Payment option</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a payment option to continue.
            </p>

            <div className="mt-4 grid gap-2">
              {[
                {
                  value: 'DOWN_PAYMENT',
                  title: '50% down payment',
                  description: 'Pay the remaining balance before pickup.',
                  amount: totalEstimate * 0.5,
                },
                {
                  value: 'FULL_PAYMENT',
                  title: 'Full payment',
                  description: 'Pay the complete rental amount now.',
                  amount: totalEstimate,
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    paymentPlan === option.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-plan"
                    value={option.value}
                    checked={paymentPlan === option.value}
                    onChange={(event) => setPaymentPlan(event.target.value)}
                    className="sr-only"
                  />
                  <span className="flex justify-between gap-3 text-sm">
                    <span>
                      <span className="block font-medium">{option.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(option.amount)}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              The payment QR will appear on the next step.
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Each instrument must have at least an 8-hour rental period.
          </p>
          <button
            type="button"
            onClick={submitRentals}
            disabled={submitting || checkingId !== null || !paymentPlan}
            aria-busy={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {submitting ? 'Loading...' : 'Proceed Payment'}
          </button>
        </aside>
      </div>
    </main>
  )
}
