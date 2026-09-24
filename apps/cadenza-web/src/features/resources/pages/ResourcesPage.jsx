import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import SelectField from '../../../components/select-field'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { resourcesApi } from '../api/resources.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (r) => r?.data ?? r ?? []

export default function ResourcesPage({ kind = 'ALL' }) {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreateInstrument = can('cadenza_instruments:create')
  const canCreateRoom = can('cadenza_rooms:create')
  const canUpdateInstrument = can('cadenza_instruments:update')
  const canUpdateRoom = can('cadenza_rooms:update')
  const canViewInstrument = can('cadenza_instruments:read') || canCreateInstrument || canUpdateInstrument
  const canViewRoom = can('cadenza_rooms:read') || canCreateRoom || canUpdateRoom
  const canView = kind === 'INSTRUMENT' ? canViewInstrument : kind === 'ROOM' ? canViewRoom : canViewInstrument || canViewRoom
  const canCreate = kind === 'INSTRUMENT' ? canCreateInstrument : kind === 'ROOM' ? canCreateRoom : canCreateInstrument || canCreateRoom
  const instruments = useQuery({ queryKey: ['cadenza', 'instruments'], queryFn: resourcesApi.listInstruments, enabled: canViewInstrument })
  const rooms = useQuery({ queryKey: ['cadenza', 'rooms'], queryFn: resourcesApi.listRooms, enabled: canViewRoom })
  const [open, setOpen] = useState(false), [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ kind: kind === 'ROOM' ? 'ROOM' : 'INSTRUMENT', key: '', name: '', instrumentType: '', roomType: '', capacity: 1, rentalRate: '' })
  const createResource = useMutation({ mutationFn: resourcesApi.createResource })
  const createInstrument = useMutation({ mutationFn: resourcesApi.createInstrument, onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }) })
  const createRoom = useMutation({ mutationFn: resourcesApi.createRoom, onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }) })
  const updateInstrument = useMutation({ mutationFn: ({ id, payload }) => resourcesApi.updateInstrument(id, payload), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] }) } })
  const updateRoom = useMutation({ mutationFn: ({ id, payload }) => resourcesApi.updateRoom(id, payload), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] }) } })
  if (!canView) return <Alert variant="destructive"><AlertDescription>You are not authorized to view Cadenza resources.</AlertDescription></Alert>
  if ((kind !== 'ROOM' && canViewInstrument && instruments.isLoading) || (kind !== 'INSTRUMENT' && canViewRoom && rooms.isLoading)) return <LoadingState label="Loading resources…" rows={3} />
  if (instruments.error || rooms.error) return <Alert variant="destructive"><AlertDescription>{(instruments.error || rooms.error).message}</AlertDescription></Alert>
  const entries = [
    ...(kind !== 'ROOM' ? unwrap(instruments.data).map((x) => ({ ...x, kind: 'Instrument', label: x.instrumentType })) : []),
    ...(kind !== 'INSTRUMENT' ? unwrap(rooms.data).map((x) => ({ ...x, kind: 'Room', label: x.roomType })) : []),
  ]
  const title = kind === 'INSTRUMENT' ? 'Instruments' : kind === 'ROOM' ? 'Band Rooms' : 'Resources'
  const description = kind === 'INSTRUMENT' ? 'Manage rentable instruments and their availability.' : kind === 'ROOM' ? 'Manage band rooms used for rentals and lessons.' : 'Manage Cadenza instruments and band rooms.'
  const submit = async () => {
    if ((form.kind === 'ROOM' && !canCreateRoom) || (form.kind === 'INSTRUMENT' && !canCreateInstrument)) return
    const r = await createResource.mutateAsync({ key: form.key, name: form.name, type: form.kind === 'ROOM' ? 'CADENZA_ROOM' : 'CADENZA_INSTRUMENT' })
    const resourceId = r?.data?.id ?? r?.id
    if (!resourceId) throw new Error('Resource creation did not return an id.')
    if (form.kind === 'ROOM') await createRoom.mutateAsync({ resourceId, roomType: form.roomType, capacity: Number(form.capacity), rentalRate: String(form.rentalRate) })
    else await createInstrument.mutateAsync({ resourceId, instrumentType: form.instrumentType, rentalRate: String(form.rentalRate) })
    setOpen(false)
    await client.invalidateQueries({ queryKey: ['cadenza', 'instruments'] })
    await client.invalidateQueries({ queryKey: ['cadenza', 'rooms'] })
  }
  const error = createResource.error || createInstrument.error || createRoom.error
  return <div className="grid gap-6">
    <PageHeader title={title} description={description} actions={canCreate && <Button onClick={() => setOpen(true)}>Add {kind === 'INSTRUMENT' ? 'instrument' : kind === 'ROOM' ? 'band room' : 'resource'}</Button>} />
    {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
    <Card><CardContent className="pt-6"><DataTable columns={[
      { key: 'name', header: 'Resource', value: (x) => x.name ?? x.label ?? x.id },
      { key: 'kind', header: 'Type', render: (x) => <Badge variant="secondary">{x.kind}</Badge> },
      { key: 'status', header: 'Status', render: (x) => <Badge variant={x.status === 'AVAILABLE' ? 'default' : 'outline'}>{x.status}</Badge> },
      { key: 'rate', header: 'Hourly rate', value: (x) => `${formatCurrency(x.rentalRate)} / hour` },
      { key: 'actions', header: 'Actions', searchable: false, render: (x) => ((x.kind === 'Instrument' && canUpdateInstrument) || (x.kind === 'Room' && canUpdateRoom)) ? <Button size="sm" variant="outline" onClick={() => setEditing(x)}>Edit</Button> : null },
    ]} rows={entries} searchPlaceholder={`Search ${title.toLowerCase()}…`} /></CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add {kind === 'INSTRUMENT' ? 'instrument' : kind === 'ROOM' ? 'band room' : 'resource'}</DialogTitle></DialogHeader>
      <div className="grid gap-4">
        {kind === 'ALL' && <SelectField label="Type" options={[{ value: 'INSTRUMENT', label: 'Instrument' }, { value: 'ROOM', label: 'Band room' }]} value={form.kind} onChange={(v) => setForm({ ...form, kind: v || 'INSTRUMENT' })} />}
        <div className="grid gap-2"><Label>Resource key</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.currentTarget.value })} /></div>
        <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} /></div>
        {form.kind === 'ROOM' ? <><div className="grid gap-2"><Label>Room type</Label><Input value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.currentTarget.value })} /></div><div className="grid gap-2"><Label>Capacity</Label><Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.currentTarget.value })} /></div></> : <div className="grid gap-2"><Label>Instrument type</Label><Input value={form.instrumentType} onChange={(e) => setForm({ ...form, instrumentType: e.currentTarget.value })} /></div>}
        <div className="grid gap-2"><Label>Hourly rate</Label><Input type="number" min="0.01" step="0.01" value={form.rentalRate} onChange={(e) => setForm({ ...form, rentalRate: e.currentTarget.value })} /></div>
      </div>
      <DialogFooter><Button disabled={!form.key || !form.name || !form.rentalRate} onClick={submit}>{createResource.isPending || createInstrument.isPending || createRoom.isPending ? 'Creating…' : 'Create'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Update resource</DialogTitle></DialogHeader><div className="grid gap-4">
      <SelectField label="Status" options={['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'RETIRED'].map((x) => ({ value: x, label: x }))} value={editing?.status} onChange={(v) => setEditing({ ...editing, status: v })} />
      <div className="grid gap-2"><Label>Hourly rate</Label><Input type="number" min="0.01" step="0.01" value={editing?.rentalRate ?? ''} onChange={(e) => setEditing({ ...editing, rentalRate: e.currentTarget.value })} /></div>
    </div><DialogFooter><Button onClick={() => editing?.kind === 'Instrument' ? updateInstrument.mutate({ id: editing.id, payload: { status: editing.status, rentalRate: String(editing.rentalRate) } }) : updateRoom.mutate({ id: editing.id, payload: { status: editing.status, rentalRate: String(editing.rentalRate) } })}>{updateInstrument.isPending || updateRoom.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}