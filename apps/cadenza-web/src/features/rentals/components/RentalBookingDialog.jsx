import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import SelectField from '../../../components/select-field'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'
import { resourcesApi } from '../../resources/api/resources.api'

const unwrap = (value) => value?.data ?? value ?? []
const idOf = (value) => value == null ? '' : String(value)
const resourceName = (item, type) => item?.resource?.name || item?.name || item?.instrumentType || item?.roomType || (type === 'ROOM' ? 'Band room' : 'Instrument')
const resourceDescription = (item, type) => type === 'ROOM'
  ? [item?.roomType, item?.capacity ? `Up to ${item.capacity} people` : null].filter(Boolean).join(' · ')
  : [item?.instrumentType, item?.brand, item?.model].filter(Boolean).join(' · ')
const customerName = (customer) => [customer?.person?.firstName, customer?.person?.lastName].filter(Boolean).join(' ') || customer?.person?.email || `Customer #${customer?.id ?? ''}`

export default function RentalBookingDialog({ open, onOpenChange }) {
  const client = useQueryClient()
  const [type, setType] = useState('INSTRUMENT')
  const [form, setForm] = useState({ customerId: '', resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })

  const customers = useQuery({ queryKey: ['cadenza', 'rental-customers'], queryFn: rentalsApi.customers, enabled: open })
  const instruments = useQuery({ queryKey: ['cadenza', 'customer', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: open })
  const rooms = useQuery({ queryKey: ['cadenza', 'customer', 'rooms'], queryFn: resourcesApi.listRooms, enabled: open })
  const availability = useQuery({
    queryKey: ['cadenza', 'rental-management-availability', type, form.scheduledStart, form.scheduledEnd],
    queryFn: () => rentalsApi.availability({ rentalType: type, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() }),
    enabled: open && Boolean(form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd),
  })
  const create = useMutation({
    mutationFn: rentalsApi.create,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'rental-management-availability'] })
      setForm({ customerId: '', resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })
      onOpenChange(false)
    },
  })

  const catalog = type === 'ROOM' ? unwrap(rooms.data) : unwrap(instruments.data)
  const availableIds = useMemo(() => new Set(unwrap(availability.data).map((entry) => idOf(entry?.resource?.id ?? entry?.domain?.resourceId)).filter(Boolean)), [availability.data])
  const available = availability.isSuccess ? catalog.filter((item) => availableIds.has(idOf(item.resourceId ?? item.id))) : catalog
  const selectedResource = catalog.find((item) => idOf(item.resourceId ?? item.id) === idOf(form.resourceId))
  const durationHours = form.scheduledStart && form.scheduledEnd && form.scheduledStart < form.scheduledEnd
    ? (new Date(form.scheduledEnd) - new Date(form.scheduledStart)) / 3600000 : 0
  const total = durationHours > 0 ? durationHours * Number(selectedResource?.rentalRate ?? 0) : 0
  const error = customers.error || instruments.error || rooms.error || availability.error || create.error
  const customerOptions = unwrap(customers.data).map((customer) => ({ value: idOf(customer.id), label: customerName(customer) }))
  const resourceOptions = available.map((resource) => ({ value: idOf(resource.resourceId ?? resource.id), label: resourceName(resource, type) }))

  const close = (value) => {
    if (!value) {
      setForm({ customerId: '', resourceId: '', scheduledStart: '', scheduledEnd: '', requiredDownPayment: '' })
    }
    onOpenChange(value)
  }

  const submit = () => create.mutate({
    customerId: form.customerId,
    resourceId: form.resourceId,
    rentalType: type,
    scheduledStart: new Date(form.scheduledStart).toISOString(),
    scheduledEnd: new Date(form.scheduledEnd).toISOString(),
    requiredDownPayment: String(form.requiredDownPayment),
    currency: 'PHP',
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add rental booking</DialogTitle>
          <DialogDescription>Create a staff booking in one flow: customer, resource, schedule, and booking deposit.</DialogDescription>
        </DialogHeader>
        {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
        <div className="grid gap-5">
          <SelectField label="Customer" options={customerOptions} value={form.customerId} onChange={(value) => setForm((current) => ({ ...current, customerId: idOf(value) }))} />
          <div className="grid gap-2">
            <Label>Rental type</Label>
            <div className="flex rounded-lg border p-1">
              <Button type="button" className="flex-1" variant={type === 'INSTRUMENT' ? 'default' : 'ghost'} onClick={() => setType('INSTRUMENT')}>Instrument</Button>
              <Button type="button" className="flex-1" variant={type === 'ROOM' ? 'default' : 'ghost'} onClick={() => setType('ROOM')}>Band room</Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm((v) => ({ ...v, scheduledStart: e.currentTarget.value }))} /></div>
            <div className="grid gap-2"><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm((v) => ({ ...v, scheduledEnd: e.currentTarget.value }))} /></div>
          </div>
          <SelectField label="Available resource" options={resourceOptions} value={form.resourceId} onChange={(value) => {
            const resource = available.find((item) => idOf(item.resourceId ?? item.id) === idOf(value))
            setForm((v) => ({ ...v, resourceId: idOf(value), requiredDownPayment: resource?.requiredDownPayment ?? v.requiredDownPayment }))
          }} />
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-semibold">{durationHours ? `${durationHours.toFixed(2)} hrs` : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Estimated total</p><p className="font-semibold">{formatCurrency(total)}</p></div>
              <div><p className="text-xs text-muted-foreground">Available</p><p className="font-semibold">{availability.isSuccess ? available.length : '—'}</p></div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Booking deposit</Label>
            <Input type="number" min="0.01" step="0.01" value={form.requiredDownPayment} onChange={(e) => setForm((v) => ({ ...v, requiredDownPayment: e.currentTarget.value }))} />
            <p className="text-xs text-muted-foreground">The deposit is collected at booking; the remaining balance is collected when the rental is used.</p>
          </div>
          {selectedResource && <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{resourceName(selectedResource, type)}</p><p className="text-xs text-muted-foreground">{resourceDescription(selectedResource, type) || 'Rental resource'}</p></div><Badge variant="outline">{formatCurrency(selectedResource.rentalRate)} / hour</Badge></div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button
            disabled={create.isPending || !form.customerId || !form.resourceId || !form.scheduledStart || !form.scheduledEnd || form.scheduledStart >= form.scheduledEnd || !form.requiredDownPayment || Number(form.requiredDownPayment) <= 0 || (total > 0 && Number(form.requiredDownPayment) > total) || (availability.isSuccess && !availableIds.has(form.resourceId))}
            onClick={submit}
          >
            {create.isPending ? 'Creating…' : 'Create booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
