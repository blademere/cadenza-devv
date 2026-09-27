'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'

import { AppSidebar } from '../components/app-sidebar'
import { SiteHeader } from '../components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableCell,
  TableRow,
} from '@/components/ui/table'

import {
  Card,
  CardContent,
  CardTitle,
  CardHeader,
  CardDescription,
} from '@/components/ui/card'

import { Input } from '@/components/ui/input'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import { Label } from '@/components/ui/label'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  createInstrument,
  getInstruments,
  updateInstrument,
} from '@/features/admin/instruments.api'

const INSTRUMENT_TYPES = [
  {
    value: 'PIANO',
    label: 'Piano',
  },
  {
    value: 'GUITAR',
    label: 'Guitar',
  },
  {
    value: 'VIOLIN',
    label: 'Violin',
  },
  {
    value: 'DRUMS',
    label: 'Drums',
  },
  {
    value: 'BASS',
    label: 'Bass',
  },
  {
    value: 'KEYBOARD',
    label: 'Keyboard',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
]

const INSTRUMENT_STATUSES = [
  'AVAILABLE',
  'UNAVAILABLE',
  'MAINTENANCE',
  'RETIRED',
]

const emptyForm = {
  instrumentType: '',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'AVAILABLE',
}

const formatStatus = (value) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-'

const getInstrumentTypeLabel = (value) =>
  INSTRUMENT_TYPES.find((type) => type.value === value)?.label || value || '-'

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')

  const [showDialog, setShowDialog] = useState(false)
  const [editingInstrument, setEditingInstrument] = useState(null)

  const [form, setForm] = useState(emptyForm)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchInstruments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const data = await getInstruments({
        instrumentType: category === 'ALL' ? undefined : category,
      })

      setInstruments(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to load instruments.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchInstruments()
  }, [fetchInstruments])

  const filteredInstruments = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return instruments
    }

    return instruments.filter((instrument) =>
      [
        instrument.instrumentType,
        getInstrumentTypeLabel(instrument.instrumentType),
        instrument.brand,
        instrument.model,
        instrument.serialNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [instruments, search])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const openAddDialog = () => {
    setEditingInstrument(null)
    setForm({ ...emptyForm })
    setError('')
    setShowDialog(true)
  }

  const openEditDialog = (instrument) => {
    setEditingInstrument(instrument)

    setForm({
      instrumentType: instrument.instrumentType || '',
      brand: instrument.brand || '',
      model: instrument.model || '',
      serialNumber: instrument.serialNumber || '',
      status: instrument.status || 'AVAILABLE',
    })

    setError('')
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError('')

      const data = {
        instrumentType: form.instrumentType,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        status: form.status,
      }

      if (editingInstrument) {
        await updateInstrument(editingInstrument.id, data)
      } else {
        await createInstrument(data)
      }

      setShowDialog(false)
      setEditingInstrument(null)
      setForm({ ...emptyForm })

      await fetchInstruments()
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to save instrument.',
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

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Instruments</h1>

              <p className="text-muted-foreground">
                Manage instruments and their availability.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchInstruments}
                disabled={isLoading}
              >
                <RefreshCwIcon
                  className={isLoading ? 'animate-spin' : ''}
                />
                Refresh
              </Button>

              <Button onClick={openAddDialog}>
                <PlusIcon />
                Add Instrument
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Instrument List</CardTitle>

              <CardDescription>
                All instruments currently registered in the system.
              </CardDescription>

              <div className="flex items-center justify-between gap-2 pt-4">
                <div className="relative max-w-sm flex-1">
                  <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                  <Input
                    className="pl-9"
                    placeholder="Search instrument..."
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                  />
                </div>

                <Select
                  value={category}
                  onValueChange={setCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ALL">
                      All Categories
                    </SelectItem>

                    {INSTRUMENT_TYPES.map((type) => (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Serial Number</TableHead>
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
                    ) : filteredInstruments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No instruments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInstruments.map((instrument) => (
                        <TableRow key={instrument.id}>
                          <TableCell className="font-medium">
                            {[
                              instrument.brand,
                              instrument.model,
                            ]
                              .filter(Boolean)
                              .join(' ') ||
                              getInstrumentTypeLabel(
                                instrument.instrumentType,
                              )}
                          </TableCell>

                          <TableCell>
                            {getInstrumentTypeLabel(
                              instrument.instrumentType,
                            )}
                          </TableCell>

                          <TableCell>
                            {instrument.brand || '-'}
                          </TableCell>

                          <TableCell>
                            {instrument.model || '-'}
                          </TableCell>

                          <TableCell>
                            {instrument.serialNumber || '-'}
                          </TableCell>

                          <TableCell>
                            {formatStatus(instrument.status)}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  openEditDialog(instrument)
                                }
                                aria-label="Edit instrument"
                              >
                                <PencilIcon />
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
            open={showDialog}
            onOpenChange={setShowDialog}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingInstrument
                    ? 'Edit Instrument'
                    : 'Add Instrument'}
                </DialogTitle>

                <DialogDescription>
                  {editingInstrument
                    ? 'Update the instrument information.'
                    : 'Add a new instrument to the system.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-4">
                <div className="grid gap-2">
                  <Label>Category</Label>

                  <Select
                    value={form.instrumentType}
                    onValueChange={(value) =>
                      updateForm('instrumentType', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>

                    <SelectContent>
                      {INSTRUMENT_TYPES.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="instrument-brand">
                    Brand
                  </Label>

                  <Input
                    id="instrument-brand"
                    placeholder="e.g. Yamaha"
                    value={form.brand}
                    onChange={(event) =>
                      updateForm('brand', event.target.value)
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="instrument-model">
                    Model
                  </Label>

                  <Input
                    id="instrument-model"
                    placeholder="e.g. FG800"
                    value={form.model}
                    onChange={(event) =>
                      updateForm('model', event.target.value)
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="instrument-serial">
                    Serial Number
                  </Label>

                  <Input
                    id="instrument-serial"
                    placeholder="Optional"
                    value={form.serialNumber}
                    onChange={(event) =>
                      updateForm(
                        'serialNumber',
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>

                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      updateForm('status', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {INSTRUMENT_STATUSES.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                        >
                          {formatStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={
                    isSaving || !form.instrumentType
                  }
                >
                  {isSaving
                    ? 'Saving...'
                    : editingInstrument
                      ? 'Save Changes'
                      : 'Add Instrument'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}