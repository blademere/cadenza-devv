import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import DataTable from '../../../components/data-table'
import PageHeader from '../../../components/page-header'
import SelectField from '../../../components/select-field'
import LoadingState from '../../../components/loading-state'
import { customersApi } from '../../customers/api/customers.api'
import { instructorsApi } from '../../instructors/api/instructors.api'
import { staffApi } from '../api/staff.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (r) => r?.data ?? r ?? []
const personName = (person) =>
  [person?.firstName, person?.middleName, person?.lastName, person?.suffix]
    .filter(Boolean)
    .join(' ') || person?.email || 'Unknown person'

export default function UsersPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canInstructorRead = can('cadenza_instructors:read')
  const canInstructorCreate = can('cadenza_instructors:create')
  const canInstructorManage = can('cadenza_instructors:manage')
  const canCustomerManage = can('cadenza_customers:manage')
  const canStaffRead = can('cadenza_staff:read')
  const canStaffCreate = can('cadenza_staff:create')
  const canStaffManage = can('cadenza_staff:manage')

  const customers = useQuery({ queryKey: ['cadenza', 'customers'], queryFn: customersApi.list, enabled: canCustomerManage })
  const instructors = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list, enabled: canInstructorRead })
  const candidates = useQuery({ queryKey: ['cadenza', 'instructor-candidates'], queryFn: instructorsApi.listCandidates, enabled: canInstructorCreate })
  const customerCandidates = useQuery({ queryKey: ['cadenza', 'customer-candidates'], queryFn: customersApi.listCandidates, enabled: canCustomerManage })
  const staff = useQuery({ queryKey: ['cadenza', 'staff'], queryFn: staffApi.list, enabled: canStaffRead })
  const staffCandidates = useQuery({ queryKey: ['cadenza', 'staff-candidates'], queryFn: staffApi.listCandidates, enabled: canStaffCreate })

  const [editing, setEditing] = useState(null)
  const [availabilityInstructor, setAvailabilityInstructor] = useState(null)
  const [availabilityRules, setAvailabilityRules] = useState(null)
  const [blockDraft, setBlockDraft] = useState({ startsAt: '', endsAt: '', reason: '' })
  const [addInstructorOpen, setAddInstructorOpen] = useState(false)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ personId: '' })
  const [newStaff, setNewStaff] = useState({ personId: '', staffType: 'STAFF' })
  const [newInstructor, setNewInstructor] = useState({ personId: '', specialty: '' })
  const availability = useQuery({
    queryKey: ['cadenza', 'instructor-availability', availabilityInstructor?.id],
    queryFn: () => instructorsApi.getAvailability(availabilityInstructor.id),
    enabled: Boolean(availabilityInstructor),
  })

  const updateCustomer = useMutation({
    mutationFn: ({ id, status }) => customersApi.update(id, { status }),
    onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'customers'] }) },
  })
  const updateStaff = useMutation({ mutationFn: ({ id, status, staffType }) => staffApi.update(id, { status, staffType }), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'staff'] }) } })
  const createCustomer = useMutation({ mutationFn: customersApi.create, onSuccess: () => { setAddCustomerOpen(false); setNewCustomer({ personId: '' }); client.invalidateQueries({ queryKey: ['cadenza', 'customers'] }); client.invalidateQueries({ queryKey: ['cadenza', 'customer-candidates'] }) } })
  const createStaff = useMutation({ mutationFn: staffApi.create, onSuccess: () => { setAddStaffOpen(false); setNewStaff({ personId: '', staffType: 'STAFF' }); client.invalidateQueries({ queryKey: ['cadenza', 'staff'] }); client.invalidateQueries({ queryKey: ['cadenza', 'staff-candidates'] }) } })
  const updateInstructor = useMutation({
    mutationFn: ({ id, status, specialty }) => instructorsApi.update(id, { status, specialty }),
    onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'instructors'] }) },
  })
  const createInstructor = useMutation({
    mutationFn: instructorsApi.create,
    onSuccess: () => {
      setAddInstructorOpen(false)
      setNewInstructor({ personId: '', specialty: '' })
      client.invalidateQueries({ queryKey: ['cadenza', 'instructors'] })
      client.invalidateQueries({ queryKey: ['cadenza', 'instructor-candidates'] })
    },
  })
  const replaceAvailability = useMutation({
    mutationFn: ({ id, rules }) => instructorsApi.replaceAvailability(id, { rules }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'instructor-availability', availabilityInstructor?.id] }),
  })
  const addBlock = useMutation({
    mutationFn: ({ id, payload }) => instructorsApi.addAvailabilityBlock(id, payload),
    onSuccess: () => {
      setBlockDraft({ startsAt: '', endsAt: '', reason: '' })
      client.invalidateQueries({ queryKey: ['cadenza', 'instructor-availability', availabilityInstructor?.id] })
    },
  })
  const removeBlock = useMutation({
    mutationFn: ({ id, blockId }) => instructorsApi.removeAvailabilityBlock(id, blockId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'instructor-availability', availabilityInstructor?.id] }),
  })
  const register = useMutation({ mutationFn: customersApi.registerMe, onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'customers'] }) })

  if ((canCustomerManage && customers.isLoading) || (canInstructorRead && instructors.isLoading) || (canStaffRead && staff.isLoading)) return <LoadingState label="Loading people…" rows={4} />
  if ((canCustomerManage && customers.error) || (canInstructorRead && instructors.error) || (canStaffRead && staff.error)) return <Alert variant="destructive"><AlertDescription>{(customers.error || instructors.error || staff.error).message}</AlertDescription></Alert>

  const entries = [
    ...(canCustomerManage ? unwrap(customers.data).map((x) => ({ ...x, role: 'Customer' })) : []),
    ...(canInstructorRead ? unwrap(instructors.data).map((x) => ({ ...x, role: 'Instructor' })) : []),
    ...(canStaffRead ? unwrap(staff.data).map((x) => ({ ...x, role: 'Staff' })) : []),
  ]
  const error = updateCustomer.error || updateInstructor.error || updateStaff.error || createCustomer.error || createStaff.error || createInstructor.error || register.error || candidates.error || customerCandidates.error || staffCandidates.error || availability.error || replaceAvailability.error || addBlock.error || removeBlock.error
  const candidateOptions = unwrap(candidates.data).map((person) => ({ value: person.id, label: personName(person) + (person.email ? ` — ${person.email}` : '') }))
  const customerCandidateOptions = unwrap(customerCandidates.data).map((person) => ({ value: person.id, label: personName(person) + (person.email ? ` — ${person.email}` : '') }))
  const staffCandidateOptions = unwrap(staffCandidates.data).map((person) => ({ value: person.id, label: personName(person) + (person.email ? ` — ${person.email}` : '') }))
  const availabilityData = availability.data?.data ?? availability.data ?? { rules: [], blocks: [] }
  const openAvailability = (instructor) => {
    setAvailabilityInstructor(instructor)
    setAvailabilityRules(null)
    setBlockDraft({ startsAt: '', endsAt: '', reason: '' })
  }
  const rulesForEditor = availabilityRules ?? (availabilityData.rules ?? [])
  const addRule = () => setAvailabilityRules((rules) => [...(rules ?? availabilityData.rules ?? []), { dayOfWeek: 1, startMinute: 540, endMinute: 1020 }])
  const updateRule = (index, patch) => setAvailabilityRules((rules) => (rules ?? availabilityData.rules ?? []).map((rule, i) => i === index ? { ...rule, ...patch } : rule))
  const removeRule = (index) => setAvailabilityRules((rules) => (rules ?? availabilityData.rules ?? []).filter((_, i) => i !== index))
  const minutesToTime = (minutes) => String(Math.floor(Number(minutes) / 60)).padStart(2, '0') + ':' + String(Number(minutes) % 60).padStart(2, '0')
  const timeToMinutes = (value) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
  const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '—'

  const columns = [
    { key: 'name', header: 'Name', value: (x) => personName(x.person) },
    { key: 'email', header: 'Email', value: (x) => x.person?.email ?? '—' },
    { key: 'role', header: 'Role', render: (x) => <Badge variant="secondary">{x.role}</Badge> },
    { key: 'specialty', header: 'Specialty', value: (x) => x.specialty ?? '—' },
    { key: 'status', header: 'Status', render: (x) => <Badge variant={x.status === 'ACTIVE' ? 'default' : 'outline'}>{x.status ?? '—'}</Badge> },
    { key: 'actions', header: 'Actions', searchable: false, render: (x) => ((x.role === 'Customer' && canCustomerManage) || (x.role === 'Instructor' && canInstructorManage) || (x.role === 'Staff' && canStaffManage)) ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(x)}>Edit</Button>{x.role === 'Instructor' && <Button size="sm" variant="outline" onClick={() => openAvailability(x)}>Availability</Button>}</div> : null },
  ]

  return <div className="space-y-6">
    <PageHeader title="Users" description="Manage Cadenza customers, staff, and instructors." actions={<div className="flex flex-wrap gap-2">{canCustomerManage && <Button variant="outline" onClick={() => setAddCustomerOpen(true)}>Add customer</Button>}{canStaffCreate && <Button variant="outline" onClick={() => setAddStaffOpen(true)}>Add staff</Button>}{canInstructorCreate && <Button variant="outline" onClick={() => setAddInstructorOpen(true)}>Add instructor</Button>}<Button disabled={register.isPending} onClick={() => register.mutate()}>{register.isPending ? 'Registering…' : 'Register my account as customer'}</Button></div>} />
    {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
    <Card><CardContent className="pt-6"><DataTable columns={columns} rows={entries} searchPlaceholder="Search users…" /></CardContent></Card>

    <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}><DialogContent><DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader><div className="grid gap-4"><SelectField label="Person" options={customerCandidateOptions} value={newCustomer.personId} onChange={(value) => setNewCustomer({ personId: value })} />{customerCandidates.isLoading && <p className="text-sm text-muted-foreground">Loading eligible people…</p>}{!customerCandidates.isLoading && !customerCandidates.error && customerCandidateOptions.length === 0 && <p className="text-sm text-muted-foreground">No eligible people are available to add as a customer.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setAddCustomerOpen(false)}>Cancel</Button><Button disabled={!newCustomer.personId || createCustomer.isPending} onClick={() => createCustomer.mutate(newCustomer)}>{createCustomer.isPending ? 'Adding…' : 'Add customer'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}><DialogContent><DialogHeader><DialogTitle>Add staff</DialogTitle></DialogHeader><div className="grid gap-4"><SelectField label="Person" options={staffCandidateOptions} value={newStaff.personId} onChange={(value) => setNewStaff({ ...newStaff, personId: value })} /><SelectField label="Staff type" options={[{ value: 'STAFF', label: 'Staff' }, { value: 'FRONT_DESK', label: 'Front desk' }, { value: 'MANAGER', label: 'Manager' }, { value: 'INSTRUCTOR', label: 'Instructor' }]} value={newStaff.staffType} onChange={(value) => setNewStaff({ ...newStaff, staffType: value })} />{staffCandidates.isLoading && <p className="text-sm text-muted-foreground">Loading eligible people…</p>}{!staffCandidates.isLoading && !staffCandidates.error && staffCandidateOptions.length === 0 && <p className="text-sm text-muted-foreground">No eligible people are available to add as staff.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setAddStaffOpen(false)}>Cancel</Button><Button disabled={!newStaff.personId || createStaff.isPending} onClick={() => createStaff.mutate(newStaff)}>{createStaff.isPending ? 'Adding…' : 'Add staff'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={addInstructorOpen} onOpenChange={setAddInstructorOpen}>
      <DialogContent><DialogHeader><DialogTitle>Add instructor</DialogTitle></DialogHeader><div className="grid gap-4"><SelectField label="Person" options={candidateOptions} value={newInstructor.personId} onChange={(value) => setNewInstructor({ ...newInstructor, personId: value })} /><div className="grid gap-2"><Label htmlFor="instructor-specialty">Specialty</Label><Input id="instructor-specialty" value={newInstructor.specialty} onChange={(e) => setNewInstructor({ ...newInstructor, specialty: e.currentTarget.value })} placeholder="e.g. Piano, Guitar, Vocal" maxLength={100} /></div>{candidates.isLoading && <p className="text-sm text-muted-foreground">Loading eligible people…</p>}{!candidates.isLoading && !candidates.error && candidateOptions.length === 0 && <p className="text-sm text-muted-foreground">No eligible people are available to add as an instructor.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setAddInstructorOpen(false)}>Cancel</Button><Button disabled={!newInstructor.personId || createInstructor.isPending} onClick={() => createInstructor.mutate({ personId: newInstructor.personId, specialty: newInstructor.specialty || undefined })}>{createInstructor.isPending ? 'Adding…' : 'Add instructor'}</Button></DialogFooter></DialogContent>
    </Dialog>

    <Dialog open={Boolean(availabilityInstructor)} onOpenChange={(value) => !value && setAvailabilityInstructor(null)}>
      <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Instructor availability — {personName(availabilityInstructor?.person)}</DialogTitle></DialogHeader>{availability.isLoading ? <LoadingState label="Loading availability…" rows={3} /> : <div className="grid gap-6"><div className="grid gap-3"><div className="flex items-center justify-between gap-2"><div><h3 className="font-medium">Weekly availability</h3><p className="text-sm text-muted-foreground">Define recurring time windows per day.</p></div>{canInstructorManage && <Button variant="outline" size="sm" onClick={addRule}>Add time window</Button>}</div>{rulesForEditor.length === 0 && <p className="text-sm text-muted-foreground">No weekly availability configured.</p>}{rulesForEditor.map((rule, index) => <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"><SelectField label="Day" options={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((label, dayOfWeek) => ({ value: String(dayOfWeek), label }))} value={String(rule.dayOfWeek)} onChange={(value) => updateRule(index, { dayOfWeek: Number(value) })} disabled={!canInstructorManage} /><div className="grid gap-2"><Label>Start</Label><Input type="time" value={minutesToTime(rule.startMinute)} disabled={!canInstructorManage} onChange={(e) => updateRule(index, { startMinute: timeToMinutes(e.currentTarget.value) })} /></div><div className="grid gap-2"><Label>End</Label><Input type="time" value={minutesToTime(rule.endMinute)} disabled={!canInstructorManage} onChange={(e) => updateRule(index, { endMinute: timeToMinutes(e.currentTarget.value) })} /></div>{canInstructorManage && <Button variant="ghost" onClick={() => removeRule(index)}>Remove</Button>}</div>)}{canInstructorManage && <Button disabled={replaceAvailability.isPending} onClick={() => replaceAvailability.mutate({ id: availabilityInstructor.id, rules: rulesForEditor })}>{replaceAvailability.isPending ? 'Saving…' : 'Save weekly availability'}</Button>}</div><div className="grid gap-3 border-t pt-5"><div><h3 className="font-medium">Blocked periods</h3><p className="text-sm text-muted-foreground">Add one-off periods when the instructor cannot be scheduled.</p></div>{availabilityData.blocks?.length > 0 ? availabilityData.blocks.map((block) => <div key={block.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">{formatDateTime(block.startsAt)} → {formatDateTime(block.endsAt)}</div><div className="text-sm text-muted-foreground">{block.reason || 'No reason provided'}</div></div>{canInstructorManage && <Button variant="ghost" size="sm" disabled={removeBlock.isPending} onClick={() => removeBlock.mutate({ id: availabilityInstructor.id, blockId: block.id })}>Remove</Button>}</div>) : <p className="text-sm text-muted-foreground">No blocked periods configured.</p>}{canInstructorManage && <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1.5fr_auto] md:items-end"><div className="grid gap-2"><Label>Starts</Label><Input type="datetime-local" value={blockDraft.startsAt} onChange={(e) => setBlockDraft({ ...blockDraft, startsAt: e.currentTarget.value })} /></div><div className="grid gap-2"><Label>Ends</Label><Input type="datetime-local" value={blockDraft.endsAt} onChange={(e) => setBlockDraft({ ...blockDraft, endsAt: e.currentTarget.value })} /></div><div className="grid gap-2"><Label>Reason</Label><Input value={blockDraft.reason} maxLength={500} placeholder="Optional" onChange={(e) => setBlockDraft({ ...blockDraft, reason: e.currentTarget.value })} /></div><Button disabled={!blockDraft.startsAt || !blockDraft.endsAt || addBlock.isPending} onClick={() => addBlock.mutate({ id: availabilityInstructor.id, payload: { startsAt: new Date(blockDraft.startsAt).toISOString(), endsAt: new Date(blockDraft.endsAt).toISOString(), reason: blockDraft.reason || undefined } })}>{addBlock.isPending ? 'Adding…' : 'Block time'}</Button></div>}</div></div>}</DialogContent>
    </Dialog>

    <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Update {editing?.role?.toLowerCase()}</DialogTitle></DialogHeader><div className="grid gap-4">{editing?.role === 'Staff' && <div className="grid gap-2"><Label>Staff type</Label><SelectField options={[{ value: 'STAFF', label: 'Staff' }]} value={editing?.staffType ?? 'STAFF'} onChange={(value) => setEditing({ ...editing, staffType: value })} /></div>}{editing?.role === 'Instructor' && <div className="grid gap-2"><Label>Specialty</Label><Input value={editing.specialty ?? ''} onChange={(e) => setEditing({ ...editing, specialty: e.currentTarget.value })} /></div>}<SelectField label="Status" options={['ACTIVE', 'INACTIVE'].map((x) => ({ value: x, label: x }))} value={editing?.status} onChange={(value) => setEditing({ ...editing, status: value })} /></div><DialogFooter><Button onClick={() => editing.role === 'Customer' ? updateCustomer.mutate({ id: editing.id, status: editing.status }) : editing.role === 'Staff' ? updateStaff.mutate({ id: editing.id, status: editing.status, staffType: editing.staffType }) : updateInstructor.mutate({ id: editing.id, status: editing.status, specialty: editing.specialty })}>{updateCustomer.isPending || updateInstructor.isPending || updateStaff.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
