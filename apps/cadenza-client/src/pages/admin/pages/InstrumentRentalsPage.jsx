import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  SaveIcon,
} from 'lucide-react'

import { AppSidebar } from '@/pages/admin/components/app-sidebar'
import { SiteHeader } from '@/pages/admin/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'

import {
  getInstruments,
  updateInstrument,
} from '@/services/admin/instrumentsService'

const getInstrumentName = (instrument) =>
  [instrument.brand, instrument.model]
    .filter(Boolean)
    .join(' ') || 'Instrument'

const getInstrumentCategory = (instrument) =>
  instrument.itemCategory?.name ||
  instrument.instrumentType?.name ||
  'Uncategorized'

export default function InstrumentRentalsPage() {
  const [instruments, setInstruments] = useState([])
  const [rateDrafts, setRateDrafts] = useState({})
  const [savingRateId, setSavingRateId] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const activeInstruments = useMemo(
    () =>
      instruments.filter(
        (instrument) => instrument.status !== 'RETIRED',
      ),
    [instruments],
  )

  const instrumentsWithoutRates = useMemo(
    () =>
      activeInstruments.filter(
        (instrument) =>
          instrument.rentalRate === null ||
          instrument.rentalRate === undefined ||
          Number(instrument.rentalRate) <= 0,
      ),
    [activeInstruments],
  )

  const categories = useMemo(
    () =>
      [...new Set(activeInstruments.map(getInstrumentCategory))]
        .sort((first, second) => first.localeCompare(second)),
    [activeInstruments],
  )

  const filteredInstruments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return activeInstruments.filter((instrument) => {
      const matchesCategory =
        categoryFilter === 'ALL' ||
        getInstrumentCategory(instrument) === categoryFilter
      const matchesSearch =
        !query ||
        [getInstrumentName(instrument), getInstrumentCategory(instrument), instrument.serialNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeInstruments, categoryFilter, search])

  const fetchInstruments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const data = await getInstruments()
      const result = Array.isArray(data) ? data : []

      setInstruments(result)
      setRateDrafts(
        result.reduce((drafts, instrument) => {
          drafts[instrument.id] = instrument.rentalRate ?? ''
          return drafts
        }, {}),
      )
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to load instruments.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInstruments()
  }, [fetchInstruments])

  const updateRateDraft = (instrumentId, value) => {
    setRateDrafts((current) => ({
      ...current,
      [instrumentId]: value,
    }))
  }

  const saveInstrumentRate = async (instrument) => {
    const rentalRate = Number(rateDrafts[instrument.id])

    if (!Number.isFinite(rentalRate) || rentalRate <= 0) {
      setError('Rental rate must be greater than zero.')
      return
    }

    try {
      setSavingRateId(instrument.id)
      setError('')

      await updateInstrument(instrument.id, { rentalRate })
      await fetchInstruments()
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to save instrument rental rate.',
      )
    } finally {
      setSavingRateId(null)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Instrument Rental Rates
              </h1>

              <p className="text-muted-foreground">
                Set each instrument's minimum rental rate for 8 hours.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={fetchInstruments}
              disabled={isLoading}
            >
              <RefreshCwIcon className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Card
            className={
              instrumentsWithoutRates.length > 0
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-emerald-500/50 bg-emerald-500/5'
            }
          >
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="mt-1">
                <AlertTriangleIcon
                  className={
                    instrumentsWithoutRates.length > 0
                      ? 'text-destructive'
                      : 'text-emerald-600'
                  }
                />
              </div>

              <div>
                <CardTitle>
                  {instrumentsWithoutRates.length > 0
                    ? `${instrumentsWithoutRates.length} Rate${
                        instrumentsWithoutRates.length === 1 ? '' : 's'
                      } Not Set`
                    : 'All Rates Set'}
                </CardTitle>

                <CardDescription>
                  {instrumentsWithoutRates.length > 0
                    ? 'Set a rate for every active instrument before accepting rentals. Each rate is the minimum charge for 8 hours.'
                    : 'Every active instrument has a rate. Each rate is the minimum charge for 8 hours.'}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instrument & Equipment Rates</CardTitle>

              <CardDescription>
                Each rate is the minimum charge for an 8-hour rental. Rentals
                shorter than 8 hours are not allowed.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  className="sm:max-w-sm"
                  placeholder="Search instruments, categories, or serial numbers"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rate (8 Hours Minimum)</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Loading instruments...
                        </TableCell>
                      </TableRow>
                    ) : filteredInstruments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No instruments match the current search or filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInstruments.map((instrument) => (
                        <TableRow key={instrument.id}>
                          <TableCell className="font-medium">
                            {getInstrumentName(instrument)}
                          </TableCell>
                          <TableCell>
                            {getInstrumentCategory(instrument)}
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-32"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={rateDrafts[instrument.id] ?? ''}
                              onChange={(event) =>
                                updateRateDraft(
                                  instrument.id,
                                  event.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => saveInstrumentRate(instrument)}
                              disabled={savingRateId === instrument.id}
                            >
                              <SaveIcon />
                              {savingRateId === instrument.id
                                ? 'Saving...'
                                : 'Save'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
