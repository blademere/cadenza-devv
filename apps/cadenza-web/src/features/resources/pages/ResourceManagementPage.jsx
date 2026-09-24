import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Wrench } from '@phosphor-icons/react'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import SelectField from '../../../components/select-field'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { resourcesApi } from '../api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const EMPTY_FORM = {
  kind: 'INSTRUMENT',
  key: '',
  name: '',
  description: '',
  instrumentType: '',
  brand: '',
  model: '',
  serialNumber: '',
  roomType: '',
  capacity: '1',
  rentalRate: '',
}

const unwrap = (r) => r?.data ?? r ?? []

const statusVariant = (status) => {
  if (status === 'AVAILABLE') return 'default'
  if (status === 'MAINTENANCE' || status === 'UNAVAILABLE') return 'destructive'
  return 'outline'
}

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0

export default function ResourceManagementPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreateInstrument = can('cadenza_instruments:create')
  const canCreateRoom = can('cadenza_rooms:create')
  const canUpdateInstrument = can('cadenza_instruments:update')
  const canUpdateRoom = can('cadenza_rooms:update')
  const canViewInstrument = can('cadenza_instruments:read') || canCreateInstrument || canUpdateInstrument
  const canViewRoom = can('cadenza_rooms:read') || canCreateRoom || canUpdateRoom
  const canView = canViewInstrument || canViewRoom
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const instruments = useQuery({ queryKey: ['cadenza', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: canViewInstrument })
  const rooms = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms, enabled: canViewRoom })
  const createResource = useMutation({ mutationFn: resourcesApi.createResource })
  const createInstrument = useMutation({ mutationFn: resourcesApi.createInstrument })
  const createRoom = useMutation({ mutationFn: resourcesApi.createRoom })
  const updateInstrument = useMutation({ mutationFn: ({ id, payload }) => resourcesApi.updateInstrument(id, payload), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }) } })
  const updateRoom = useMutation({ mutationFn: ({ id, payload }) => resourcesApi.updateRoom(id, payload), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }) } })

  const entries = useMemo(() => [
    ...(canViewInstrument ? unwrap(instruments.data).map((x) => ({ ...x, kind: 'Instrument', label: x.instrumentType })) : []),
    ...(canViewRoom ? unwrap(rooms.data).map((x) => ({ ...x, kind: 'Band room', label: x.roomType })) : []),
  ], [instruments.data, rooms.data, canViewInstrument, canViewRoom])

  const filteredEntries = useMemo(() => entries.filter((x) => (
    (typeFilter === 'ALL' || x.kind === typeFilter) &&
    (statusFilter === 'ALL' || x.status === statusFilter)
  )), [entries, typeFilter, statusFilter])

  const availableCount = entries.filter((x) => x.status === 'AVAILABLE').length
  const attentionCount = entries.filter((x) => ['MAINTENANCE', 'UNAVAILABLE'].includes(x.status)).length
  const isRoom = form.kind === 'ROOM'
  const canCreateSelected = isRoom ? canCreateRoom : canCreateInstrument
  const formComplete = Boolean(
    form.key.trim() &&
    form.name.trim() &&
    form.description.trim() &&
    form.rentalRate &&
    isPositiveNumber(form.rentalRate) &&
    (isRoom
      ? form.roomType.trim() && isPositiveInteger(form.capacity)
      : form.instrumentType.trim()),
  )

  if (!canView) return <Alert variant="destructive"><AlertDescription>You are not authorized to view Cadenza resources.</AlertDescription></Alert>
  if ((canViewInstrument && instruments.isLoading) || (canViewRoom && rooms.isLoading)) return <LoadingState label="Loading resources…" rows={5} />
  if (instruments.error || rooms.error) return <Alert variant="destructive"><AlertDescription>{(instruments.error || rooms.error).message}</AlertDescription></Alert>

  const submit = async () => {
    if (!formComplete || !canCreateSelected) return

    const r = await createResource.mutateAsync({
      key: form.key.trim(),
      name: form.name.trim(),
      type: isRoom ? 'CADENZA_ROOM' : 'CADENZA_INSTRUMENT',
      description: form.description.trim(),
    })
    const resourceId = r?.data?.id ?? r?.id
    if (!resourceId) throw new Error('Resource creation did not return an id.')

    if (isRoom) {
      await createRoom.mutateAsync({
        resourceId,
        roomType: form.roomType.trim(),
        capacity: Number(form.capacity),
        rentalRate: String(form.rentalRate),
      })
    } else {
      await createInstrument.mutateAsync({
        resourceId,
        instrumentType: form.instrumentType.trim(),
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        rentalRate: String(form.rentalRate),
      })
    }

    setOpen(false)
    setForm(EMPTY_FORM)
    await Promise.all([
      client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }),
      client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }),
    ])
  }

  const error = createResource.error || createInstrument.error || createRoom.error
  const isSaving = createResource.isPending || createInstrument.isPending || createRoom.isPending || updateInstrument.isPending || updateRoom.isPending

  return <div className="grid gap-6">
    <PageHeader
      title="Resources"
      description="Manage instruments and band rooms from one inventory workspace."
      actions={canCreateInstrument || canCreateRoom ? <Button onClick={() => setOpen(true)}>Add resource</Button> : null}
    />

    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 pt-6"><Archive size={24} aria-hidden /><div><p className="text-sm text-muted-foreground">Total resources</p><p className="text-2xl font-semibold">{entries.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-6"><div><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-semibold">{availableCount}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-6"><Wrench size={24} aria-hidden /><div><p className="text-sm text-muted-foreground">Needs attention</p><p className="text-2xl font-semibold">{attentionCount}</p></div></CardContent></Card>
    </div>

    {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}

    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="text-sm text-muted-foreground self-center">
            Showing <span className="font-medium text-foreground">{filteredEntries.length}</span> of <span className="font-medium text-foreground">{entries.length}</span> resources
          </div>
          <SelectField label="Type" options={[{ value: 'ALL', label: 'All types' }, { value: 'Instrument', label: 'Instruments' }, { value: 'Band room', label: 'Band rooms' }]} value={typeFilter} onChange={(v) => setTypeFilter(v || 'ALL')} />
          <SelectField label="Status" options={[{ value: 'ALL', label: 'All statuses' }, ...Array.from(new Set(entries.map((x) => x.status).filter(Boolean))).map((x) => ({ value: x, label: x }))]} value={statusFilter} onChange={(v) => setStatusFilter(v || 'ALL')} />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Resource', value: (x) => x.name ?? x.id },
            { key: 'kind', header: 'Type', render: (x) => <Badge variant="secondary">{x.kind}</Badge> },
            { key: 'label', header: 'Category', value: (x) => x.label || '—' },
            { key: 'status', header: 'Status', render: (x) => <Badge variant={statusVariant(x.status)}>{x.status || '—'}</Badge> },
            { key: 'rate', header: 'Hourly rate', value: (x) => x.rentalRate == null ? '—' : `${formatCurrency(x.rentalRate)} / hour` },
            { key: 'actions', header: 'Actions', searchable: false, render: (x) => ((x.kind === 'Instrument' && canUpdateInstrument) || (x.kind === 'Band room' && canUpdateRoom)) ? <Button size="sm" variant="outline" onClick={() => setEditing(x)}>Edit</Button> : null },
          ]}
          rows={filteredEntries}
          searchPlaceholder="Search resources by name, type, or category…"
          emptyMessage="No resources match the selected filters."
        />
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
          <SelectField label="Type" options={[{ value: 'INSTRUMENT', label: 'Instrument' }, { value: 'ROOM', label: 'Band room' }]} value={form.kind} onChange={(v) => setForm({ ...form, kind: v || 'INSTRUMENT' })} />

          <div className="grid gap-2">
            <Label htmlFor="resource-key">Resource key <span aria-hidden>*</span></Label>
            <Input id="resource-key" required maxLength={100} value={form.key} onChange={(e) => setForm({ ...form, key: e.currentTarget.value })} placeholder="e.g. guitar-001" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="resource-name">Name <span aria-hidden>*</span></Label>
            <Input id="resource-name" required maxLength={255} value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} placeholder="Display name" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="resource-description">Description <span aria-hidden>*</span></Label>
            <Textarea id="resource-description" required maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} placeholder="Describe this resource" />
          </div>

          {isRoom ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="room-type">Room type <span aria-hidden>*</span></Label>
                <Input id="room-type" required maxLength={100} value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.currentTarget.value })} placeholder="e.g. Band room" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room-capacity">Capacity <span aria-hidden>*</span></Label>
                <Input id="room-capacity" required type="number" min="1" step="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.currentTarget.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="instrument-type">Instrument type <span aria-hidden>*</span></Label>
                <Input id="instrument-type" required maxLength={100} value={form.instrumentType} onChange={(e) => setForm({ ...form, instrumentType: e.currentTarget.value })} placeholder="e.g. Acoustic guitar" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instrument-brand">Brand</Label>
                <Input id="instrument-brand" maxLength={100} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.currentTarget.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instrument-model">Model</Label>
                <Input id="instrument-model" maxLength={100} value={form.model} onChange={(e) => setForm({ ...form, model: e.currentTarget.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instrument-serial">Serial number</Label>
                <Input id="instrument-serial" maxLength={100} value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.currentTarget.value })} />
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="rental-rate">Hourly rate <span aria-hidden>*</span></Label>
            <Input id="rental-rate" required type="number" min="0.01" step="0.01" value={form.rentalRate} onChange={(e) => setForm({ ...form, rentalRate: e.currentTarget.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!formComplete || !canCreateSelected || isSaving}
            onClick={submit}
          >
            {isSaving ? 'Creating…' : 'Create resource'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {editing?.name || 'resource'}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <SelectField label="Status" options={['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'RETIRED'].map((x) => ({ value: x, label: x }))} value={editing?.status} onChange={(v) => setEditing({ ...editing, status: v })} />
          <div className="grid gap-2"><Label>Hourly rate</Label><Input type="number" min="0.01" step="0.01" value={editing?.rentalRate ?? ''} onChange={(e) => setEditing({ ...editing, rentalRate: e.currentTarget.value })} /></div>
        </div>
        <DialogFooter><Button disabled={isSaving} onClick={() => editing?.kind === 'Instrument' ? updateInstrument.mutate({ id: editing.id, payload: { status: editing.status, rentalRate: String(editing.rentalRate) } }) : updateRoom.mutate({ id: editing.id, payload: { status: editing.status, rentalRate: String(editing.rentalRate) } })}>{isSaving ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
