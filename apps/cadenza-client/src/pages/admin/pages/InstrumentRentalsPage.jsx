import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Clock3Icon,
  GuitarIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react'

import { AppSidebar } from '../components/app-sidebar'
import { SiteHeader } from '../components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  getInstrumentRentals,
  updateInstrumentRental,
} from '@/features/admin/instrument-rentals.api'

const emptyForm = {
  rentalRate: '',
  rentalDuration: '24',
}

const formatCurrency = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Not Set'
  }

  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const formatInstrumentType = (value) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

const formatStatus = (value) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

export default function InstrumentRentalsPage() {
  const [instruments, setInstruments] = useState([])
  const [editingInstrument, setEditingInstrument] =
    useState(null)

  const [form, setForm] = useState(emptyForm)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchInstrumentRentals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const data = await getInstrumentRentals()

      setInstruments(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to load instrument rentals.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(
      () => void fetchInstrumentRentals(),
      0,
    )

    return () => clearTimeout(timer)
  }, [fetchInstrumentRentals])

  const configuredInstruments = useMemo(
    () =>
      instruments.filter(
        (instrument) =>
          instrument.rentalRate !== null &&
          instrument.rentalRate !== undefined,
      ),
    [instruments],
  )

  const openConfigure = (instrument) => {
    setEditingInstrument(instrument)

    setForm({
      rentalRate:
        instrument.rentalRate !== null &&
        instrument.rentalRate !== undefined
          ? String(instrument.rentalRate)
          : '',
      rentalDuration:
        instrument.rentalDuration !== null &&
        instrument.rentalDuration !== undefined
          ? String(instrument.rentalDuration)
          : '24',
    })

    setError('')
    setDialogOpen(true)
  }

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const saveRental = async (event) => {
    event?.preventDefault()

    if (!editingInstrument) {
      return
    }

    try {
      setIsSaving(true)
      setError('')

      const rentalRate = Number(form.rentalRate)
      const rentalDuration = Number(form.rentalDuration)

      if (!Number.isFinite(rentalRate) || rentalRate <= 0) {
        throw new Error(
          'Rental rate must be greater than zero.',
        )
      }

      if (
        !Number.isInteger(rentalDuration) ||
        rentalDuration <= 0
      ) {
        throw new Error(
          'Rental duration must be greater than zero.',
        )
      }

      await updateInstrumentRental(
        editingInstrument.id,
        {
          rentalRate,
          rentalDuration,
        },
      )

      setDialogOpen(false)
      setEditingInstrument(null)
      setForm({ ...emptyForm })

      await fetchInstrumentRentals()
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to save rental configuration.',
      )
    } finally {
      setIsSaving(false)
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
                Instrument Rentals
              </h1>

              <p className="text-muted-foreground">
                Configure rental rates and durations for
                instruments.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={fetchInstrumentRentals}
              disabled={isLoading}
            >
              <RefreshCwIcon
                className={
                  isLoading ? 'animate-spin' : ''
                }
              />
              Refresh
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>
                  Total Instruments
                </CardDescription>

                <CardTitle className="text-3xl">
                  {instruments.length}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>
                  Configured Rentals
                </CardDescription>

                <CardTitle className="text-3xl">
                  {configuredInstruments.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rental Configuration</CardTitle>

              <CardDescription>
                Instruments registered in the Instruments
                feature appear here automatically.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Rental Rate</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center"
                        >
                          Loading instruments...
                        </TableCell>
                      </TableRow>
                    ) : instruments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No instruments available. Add an
                          instrument first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      instruments.map((instrument) => (
                        <TableRow key={instrument.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="rounded-md bg-muted p-2">
                                <GuitarIcon className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="font-medium">
                                  {[
                                    instrument.brand,
                                    instrument.model,
                                  ]
                                    .filter(Boolean)
                                    .join(' ') ||
                                    formatInstrumentType(
                                      instrument.instrumentType,
                                    )}
                                </p>

                                {instrument.serialNumber && (
                                  <p className="text-xs text-muted-foreground">
                                    {instrument.serialNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {formatInstrumentType(
                              instrument.instrumentType,
                            )}
                          </TableCell>

                          <TableCell>
                            {instrument.brand || '-'}
                          </TableCell>

                          <TableCell>
                            {formatCurrency(
                              instrument.rentalRate,
                            )}
                          </TableCell>

                          <TableCell>
                            {instrument.rentalDuration ? (
                              <div className="flex items-center gap-1.5">
                                <Clock3Icon className="h-4 w-4 text-muted-foreground" />
                                {instrument.rentalDuration}{' '}
                                hours
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Not Set
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {instrument.rentalRate !== null &&
                            instrument.rentalRate !==
                              undefined ? (
                              <span className="text-sm font-medium">
                                Configured
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Not Configured
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openConfigure(instrument)
                                }
                                aria-label={`Configure ${formatInstrumentType(
                                  instrument.instrumentType,
                                )}`}
                              >
                                {instrument.rentalRate !==
                                  null &&
                                instrument.rentalRate !==
                                  undefined ? (
                                  <PencilIcon />
                                ) : (
                                  <PlusIcon />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          >
            <DialogContent className="sm:max-w-[460px]">
              <form onSubmit={saveRental}>
                <DialogHeader>
                  <DialogTitle>
                    {editingInstrument?.rentalRate !== null &&
                    editingInstrument?.rentalRate !== undefined
                      ? 'Edit Rental Configuration'
                      : 'Set Rental Configuration'}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-background p-2">
                        <GuitarIcon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-medium">
                          {[
                            editingInstrument?.brand,
                            editingInstrument?.model,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                            formatInstrumentType(
                              editingInstrument?.instrumentType,
                            )}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Category:{' '}
                          {formatInstrumentType(
                            editingInstrument?.instrumentType,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rental-rate">
                      Rental Rate
                    </Label>

                    <Input
                      id="rental-rate"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 150"
                      value={form.rentalRate}
                      onChange={(event) =>
                        updateForm(
                          'rentalRate',
                          event.target.value,
                        )
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rental-duration">
                      Rental Duration
                    </Label>

                    <div className="relative">
                      <Input
                        id="rental-duration"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 24"
                        value={form.rentalDuration}
                        onChange={(event) =>
                          updateForm(
                            'rentalDuration',
                            event.target.value,
                          )
                        }
                        className="pr-16"
                        required
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        hours
                      </span>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={
                      isSaving ||
                      !form.rentalRate ||
                      !form.rentalDuration
                    }
                  >
                    {isSaving
                      ? 'Saving...'
                      : editingInstrument?.rentalRate !==
                          null &&
                        editingInstrument?.rentalRate !==
                          undefined
                        ? 'Save Changes'
                        : 'Set Rental'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}