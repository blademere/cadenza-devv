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
const resourceName = (item, type) => item?.resource?.name || item?.name || item?.instrumentType || item?.roomType || (type === 'ROOM' ? 'Band room' : 'Instrument')
const resourceDescription = (item, type) => type === 'ROOM'
  ? [item?.roomType, item?.capacity ? `Up to ${item.capacity} people` : null].filter(Boolean).join(' · ')
  : [item?.instrumentType, item?.brand, item?.model].filter(Boolean).join(' · ')

export default function FindRentalsPage() {
  const client = useQueryClient()
  const [type, setType] = useState('INSTRUMENT')
  const [selectedResource, setSelectedResource] = useState(null)
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
  const availableIds = useMemo(() => new Set(unwrap(availability.data).map((entry) => entry?.resource?.id ?? entry?.domain?.resourceId).filter(Boolean)), [availability.data])
  const available = availability.isSuccess ? catalog.filter((item) => availableIds.has(item.resourceId ?? item.id)) : catalog
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
      resourceId: resource.resourceId ?? resource.id,
      scheduledStart: '',
      scheduledEnd: '',
      requiredDownPayment: resource.requiredDownPayment ?? '',
    })
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
    <div className="space-y-6">
      <PageHeader title="Find Rentals" description="Choose an instrument or band room, check availability, and book your rental." />
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Available resources</h2><p className="text-sm text-muted-foreground">Availability updates after you choose a rental time.</p></div>
          <div className="flex gap-2"><Button variant={type === 'INSTRUMENT' ? 'default' : 'outline'} onClick={() => { setType('INSTRUMENT'); setSelectedResource(null) }}>Instruments</Button><Button variant={type === 'ROOM' ? 'default' : 'outline'} onClick={() => { setType('ROOM'); setSelectedResource(null) }}>Band rooms</Button></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm((v) => ({ ...v, scheduledStart: e.currentTarget.value }))} /></div>
          <div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm((v) => ({ ...v, scheduledEnd: e.currentTarget.value }))} /></div>
        </div>
        {available.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{form.scheduledStart && form.scheduledEnd ? 'Nothing is available for this time.' : 'No resources are currently available.'}</CardContent></Card> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{available.map((item) => <Card key={item.resourceId ?? item.id} className="flex h-full flex-col"><CardHeader><CardTitle className="text-base">{resourceName(item, type)}</CardTitle><p className="text-sm text-muted-foreground">{resourceDescription(item, type) || 'Cadenza rental resource'}</p></CardHeader><CardContent className="mt-auto flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Rate</p><p className="font-semibold">{formatCurrency(item.rentalRate)} / hour</p></div><Button onClick={() => openBooking(item)}>Rent this</Button></CardContent></Card>)}</div>}
      </section>

      <Dialog open={Boolean(selectedResource)} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Book {resourceName(selectedResource, type)}</DialogTitle><DialogDescription>Review the rental window, estimated total, and booking deposit.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <SelectField label="Resource" options={available.map((item) => ({ value: item.resourceId ?? item.id, label: resourceName(item, type) }))} value={form.resourceId} onChange={(value) => { const item = available.find((row) => (row.resourceId ?? row.id) === value); setForm((v) => ({ ...v, resourceId: value })); if (item) setSelectedResource(item) }} />
            <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm((v) => ({ ...v, scheduledStart: e.currentTarget.value }))} /></div><div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm((v) => ({ ...v, scheduledEnd: e.currentTarget.value }))} /></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Booking deposit</Label><Input type="number" min="0.01" step="0.01" value={form.requiredDownPayment} onChange={(e) => setForm((v) => ({ ...v, requiredDownPayment: e.currentTarget.value }))}/><p className="text-xs text-muted-foreground">Deposit is due at booking. The remaining balance is paid when the rental is used.</p></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Estimated total</p><p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p><p className="text-xs text-muted-foreground">{durationHours ? `${durationHours.toFixed(2)} hours × ${formatCurrency(rate)}/hour` : 'Choose a valid rental window.'}</p></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedResource(null)}>Cancel</Button><Button disabled={create.isPending || !form.resourceId || !form.scheduledStart || !form.scheduledEnd || form.scheduledStart >= form.scheduledEnd || !form.requiredDownPayment || Number(form.requiredDownPayment) <= 0 || (total > 0 && Number(form.requiredDownPayment) > total) || (availability.isSuccess && !availableIds.has(form.resourceId))} onClick={submit}>{create.isPending ? 'Booking…' : 'Confirm booking'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
