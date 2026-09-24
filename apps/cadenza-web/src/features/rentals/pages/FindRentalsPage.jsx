import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import SelectField from '../../../components/select-field'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { resourcesApi } from '../../resources/api/resources.api'

const unwrap = (value) => value?.data ?? value ?? []
const normalizeId = (value) => (value === null || value === undefined ? '' : String(value))
const resourceName = (item, type) => item?.resource?.name || item?.name || item?.instrumentType || item?.roomType || (type === 'ROOM' ? 'Band room' : 'Instrument')
const resourceDescription = (item, type) => type === 'ROOM'
  ? [item?.roomType, item?.capacity ? `Up to ${item.capacity} people` : null].filter(Boolean).join(' · ')
  : [item?.instrumentType, item?.brand, item?.model].filter(Boolean).join(' · ')

export default function FindRentalsPage() {
  const client = useQueryClient()
  const [type, setType] = useState('INSTRUMENT')
  const [selectedResource, setSelectedResource] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })

  const instruments = useQuery({ queryKey: ['cadenza', 'customer', 'instruments'], queryFn: resourcesApi.listInstruments })
  const rooms = useQuery({ queryKey: ['cadenza', 'customer', 'rooms'], queryFn: resourcesApi.listRooms })
  const availability = useQuery({
    queryKey: ['cadenza', 'customer', 'rental-availability', type, form.scheduledStart, form.scheduledEnd],
    queryFn: () => rentalsApi.availability({ rentalType: type, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() }),
    enabled: Boolean(form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd),
  })
  const create = useMutation({
    mutationFn: rentalsApi.create,
    onSuccess: () => {
      setSelectedResource(null)
      setForm({ resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })
      client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
    },
  })

  const catalog = type === 'ROOM' ? unwrap(rooms.data) : unwrap(instruments.data)
  const availableIds = useMemo(() => new Set(unwrap(availability.data).map((entry) => normalizeId(entry?.resource?.id ?? entry?.domain?.resourceId)).filter(Boolean)), [availability.data])
  const filteredCatalog = catalog.filter((item) => {
    const haystack = [resourceName(item, type), resourceDescription(item, type)].join(' ').toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })
  const available = availability.isSuccess ? filteredCatalog.filter((item) => availableIds.has(normalizeId(item.resourceId ?? item.id))) : filteredCatalog
  const durationHours = form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd
    ? (new Date(form.scheduledEnd) - new Date(form.scheduledStart)) / 3600000 : 0
  const rate = Number(selectedResource?.rentalRate ?? 0)
  const total = durationHours > 0 && rate > 0 ? durationHours * rate : 0
  const error = instruments.error || rooms.error || availability.error || create.error

  if (instruments.isLoading || rooms.isLoading) return <LoadingState label="Loading rental options…" rows={5} />
  if (error) return <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>

  const openBooking = (resource) => {
    setSelectedResource(resource)
    setForm({
      resourceId: normalizeId(resource.resourceId ?? resource.id),
      scheduledStart: form.scheduledStart,
      scheduledEnd: form.scheduledEnd,
      requiredDownPayment: resource.requiredDownPayment ?? '',
    })
  }

  const updateFormField = (field) => (event) => {
    const value = event.currentTarget.value
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = () => create.mutate({
    customerId: undefined,
    resourceId: form.resourceId,
    rentalType: type,
    scheduledStart: new Date(form.scheduledStart).toISOString(),
    scheduledEnd: new Date(form.scheduledEnd).toISOString(),
    requiredDownPayment: String(form.requiredDownPayment),
    currency: 'PHP',
  })

  return (
    <div className="space-y-8">
      <PageHeader title="Find a Rental" description="Choose an instrument or band room, set your rental time, and reserve it in a few steps." />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-muted/30 p-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">1. When do you need it?</p>
                <p className="text-sm text-muted-foreground">Set the rental window first so we can show what is available.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={updateFormField('scheduledStart')} /></div>
                <div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={updateFormField('scheduledEnd')} /></div>
              </div>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-medium">Booking summary</p><p className="text-xs text-muted-foreground">{durationHours ? `${durationHours.toFixed(1)} hours selected` : 'Choose a start and end time'}</p></div>
                <Badge variant={availability.isSuccess ? 'secondary' : 'outline'}>{availability.isSuccess ? `${available.length} available` : 'Availability pending'}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium">2. Choose what you need</p><h2 className="text-xl font-semibold">Browse rentals</h2></div>
          <div className="flex rounded-lg border p-1">
            <Button size="sm" variant={type === 'INSTRUMENT' ? 'default' : 'ghost'} onClick={() => { setType('INSTRUMENT'); setSelectedResource(null); setSearch('') }}>Instruments</Button>
            <Button size="sm" variant={type === 'ROOM' ? 'default' : 'ghost'} onClick={() => { setType('ROOM'); setSelectedResource(null); setSearch('') }}>Band rooms</Button>
          </div>
        </div>
        <Input value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder={type === 'ROOM' ? 'Search band rooms…' : 'Search instruments, brands, or models…'} />
        {available.length === 0 ? (
          <Card><CardContent className="py-14 text-center"><p className="font-medium">{search ? 'No matches found' : 'Nothing is available for this time'}</p><p className="mt-1 text-sm text-muted-foreground">{search ? 'Try a different name, type, brand, or model.' : 'Try another rental window to see more options.'}</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {available.map((item) => (
              <Card key={item.resourceId ?? item.id} className="group flex h-full flex-col transition-shadow hover:shadow-md">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3"><Badge variant="outline">{type === 'ROOM' ? 'Band room' : 'Instrument'}</Badge><span className="text-xs text-muted-foreground">Available</span></div>
                  <div><CardTitle className="text-lg">{resourceName(item, type)}</CardTitle><p className="mt-1 min-h-5 text-sm text-muted-foreground">{resourceDescription(item, type) || 'Cadenza rental resource'}</p></div>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="flex items-end justify-between border-t pt-4"><div><p className="text-xs text-muted-foreground">Rental rate</p><p className="text-lg font-semibold">{formatCurrency(item.rentalRate)}<span className="text-xs font-normal text-muted-foreground"> / hour</span></p></div><Button onClick={() => openBooking(item)}>Rent this</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(selectedResource)} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Reserve {resourceName(selectedResource, type)}</DialogTitle><DialogDescription>Confirm your rental window and the deposit required to place the booking.</DialogDescription></DialogHeader>
          <div className="grid gap-5">
            <div className="rounded-xl border bg-muted/30 p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-medium">{resourceName(selectedResource, type)}</p><p className="text-sm text-muted-foreground">{resourceDescription(selectedResource, type) || 'Rental resource'}</p></div><Badge>{formatCurrency(rate)} / hour</Badge></div></div>
            <SelectField label="Resource" options={available.map((item) => ({ value: normalizeId(item.resourceId ?? item.id), label: resourceName(item, type) }))} value={form.resourceId} onChange={(value) => { const item = available.find((row) => normalizeId(row.resourceId ?? row.id) === normalizeId(value)); setForm((v) => ({ ...v, resourceId: normalizeId(value) })); if (item) setSelectedResource(item) }} />
            <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={updateFormField('scheduledStart')} /></div><div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={updateFormField('scheduledEnd')} /></div></div>
            <div className="rounded-xl border p-4"><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Duration</p><p className="font-semibold">{durationHours ? `${durationHours.toFixed(2)} hrs` : '—'}</p></div><div><p className="text-xs text-muted-foreground">Estimated total</p><p className="font-semibold">{formatCurrency(total)}</p></div><div><p className="text-xs text-muted-foreground">Deposit due now</p><p className="font-semibold">{formatCurrency(form.requiredDownPayment)}</p></div></div><p className="mt-3 text-xs text-muted-foreground">The deposit is due at booking. The remaining balance is paid when the rental is used.</p></div>
            <div className="grid gap-2"><Label>Booking deposit</Label><Input type="number" min="0.01" step="0.01" value={form.requiredDownPayment} onChange={updateFormField('requiredDownPayment')}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedResource(null)}>Back</Button><Button disabled={create.isPending || !form.resourceId || !form.scheduledStart || !form.scheduledEnd || form.scheduledStart >= form.scheduledEnd || !form.requiredDownPayment || Number(form.requiredDownPayment) <= 0 || (total > 0 && Number(form.requiredDownPayment) > total) || (availability.isSuccess && !availableIds.has(form.resourceId))} onClick={submit}>{create.isPending ? 'Reserving…' : 'Confirm & reserve'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
