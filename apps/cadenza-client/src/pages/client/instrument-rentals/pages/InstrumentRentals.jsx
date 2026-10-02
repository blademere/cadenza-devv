import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircleIcon,
  CalendarDaysIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import InstrumentCard from '../components/InstrumentCard'
import RentalStatus from '../components/RentalStatus'
import {
  getAvailableInstruments,
  getMyInstrumentRentals,
} from '../services/instrument-rental.service'

const asList = (value) => (Array.isArray(value) ? value : [])
const CART_STORAGE_KEY = 'cadenza-instrument-rental-cart'

const instrumentLabel = (instrument) =>
  instrument?.name ||
  [instrument?.brand, instrument?.model].filter(Boolean).join(' ') || 'Instrument'

const hasRentalRate = (instrument) => {
  const rate = Number(instrument?.rentalRate)

  return (
    instrument?.rentalRate !== null &&
    instrument?.rentalRate !== undefined &&
    Number.isFinite(rate) &&
    rate > 0
  )
}

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const formatCurrency = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'

  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const rentalInstrumentNames = (rental) => {
  const names = (rental?.items || [])
    .map((item) => instrumentLabel(item.instrument || item))
    .filter(Boolean)

  return names.length ? names.join(', ') : instrumentLabel(rental)
}

export default function InstrumentRentalsPage() {
  const navigate = useNavigate()
  const [instruments, setInstruments] = useState([])
  const [selectedInstruments, setSelectedInstruments] = useState(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [availableData, rentalsData] = await Promise.all([
        getAvailableInstruments(),
        getMyInstrumentRentals(),
      ])

      setInstruments(asList(availableData).filter(hasRentalRate))
      setRentals(asList(rentalsData))
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Unable to load instrument rentals.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!instruments.length) return

    const instrumentById = new Map(
      instruments.map((instrument) => [instrument.id, instrument]),
    )

    setSelectedInstruments((current) =>
      current
        .map((selected) => instrumentById.get(selected.id))
        .filter(hasRentalRate)
        .filter(Boolean),
    )
  }, [instruments])

  useEffect(() => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(selectedInstruments),
    )
  }, [selectedInstruments])

  const toggleInstrument = (instrument) => {
    if (!hasRentalRate(instrument)) return

    setSelectedInstruments((current) =>
      current.some((item) => item.id === instrument.id)
        ? current.filter((item) => item.id !== instrument.id)
        : [...current, instrument],
    )
  }

  const startRental = () => {
    if (!selectedInstruments.length) return

    const ids = selectedInstruments.map((instrument) => instrument.id)

    navigate(
      `/client/instrument-rentals/new?instruments=${encodeURIComponent(ids.join(','))}`,
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Instrument Rentals
              </h1>
              <p className="mt-1 text-muted-foreground">
                Choose an available instrument and schedule your rental.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={startRental}
                disabled={!selectedInstruments.length}
              >
                <ShoppingCartIcon />
                Cart ({selectedInstruments.length})
              </Button>
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCwIcon className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Available Instruments</CardTitle>
              <CardDescription>
                Select one or more instruments. Rates shown are the minimum
                charge for 8 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="h-5 w-5 animate-spin" />
                  Loading available instruments...
                </div>
              ) : instruments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No instruments are currently available for rental.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {instruments.map((instrument) => (
                    <InstrumentCard
                      key={instrument.id}
                      instrument={{
                        ...instrument,
                        name: instrumentLabel(instrument),
                      }}
                      selected={selectedInstruments.some(
                        (item) => item.id === instrument.id,
                      )}
                      onRent={toggleInstrument}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Rentals</CardTitle>
              <CardDescription>
                View the status and schedule of your instrument rentals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="h-5 w-5 animate-spin" />
                  Loading rentals...
                </div>
              ) : rentals.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  You do not have any instrument rentals yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Instrument</TableHead>
                        <TableHead>Rental Period</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentals.map((rental) => (
                        <TableRow key={rental.id}>
                          <TableCell className="font-medium">
                            {rental.instrumentName || rentalInstrumentNames(rental)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2 text-sm">
                              <CalendarDaysIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatDate(rental.scheduledStart)}
                                <br />
                                {formatDate(rental.scheduledEnd)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(rental.totalAmount)}</TableCell>
                          <TableCell>
                            <RentalStatus status={rental.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/client/instrument-rentals/${rental.id}`)
                              }
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
    </main>
  )
}
