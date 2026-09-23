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
import { studentsApi } from '../../students/api/students.api'
import { instructorsApi } from '../../instructors/api/instructors.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'
const unwrap = (r) => r?.data ?? r ?? []

export default function UsersPage() {
 const { can } = useAuthorization(), client = useQueryClient(), canInstructorRead = can('cadenza_instructors:read')
 const students = useQuery({ queryKey: ['cadenza', 'students'], queryFn: studentsApi.list }), instructors = useQuery({ queryKey: ['cadenza', 'instructors'], queryFn: instructorsApi.list })
 const [editing, setEditing] = useState(null)
 const updateStudent = useMutation({ mutationFn: ({ id, status }) => studentsApi.update(id, { status }), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'students'] }) } })
 const updateInstructor = useMutation({ mutationFn: ({ id, status, specialty }) => instructorsApi.update(id, { status, specialty }), onSuccess: () => { setEditing(null); client.invalidateQueries({ queryKey: ['cadenza', 'instructors'] }) } })
 const register = useMutation({ mutationFn: studentsApi.registerMe, onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'students'] }) })
 if (students.isLoading || instructors.isLoading) return <LoadingState label="Loading people…" rows={4} />
 if (students.error || instructors.error) return <Alert variant="destructive"><AlertDescription>{(students.error || instructors.error).message}</AlertDescription></Alert>
 const entries = [...unwrap(students.data).map((x) => ({ ...x, role: 'Student' })), ...(canInstructorRead ? unwrap(instructors.data).map((x) => ({ ...x, role: 'Instructor' })) : [])]
 const error = updateStudent.error || updateInstructor.error || register.error
 const columns = [
   { key: 'name', header: 'Name', value: (x) => x.person?.name ?? x.person?.fullName ?? x.personId ?? x.id },
   { key: 'role', header: 'Role', render: (x) => <Badge variant="secondary">{x.role}</Badge> },
   { key: 'specialty', header: 'Specialty', value: (x) => x.specialty ?? '—' },
   { key: 'status', header: 'Status', render: (x) => <Badge variant={x.status === 'ACTIVE' ? 'default' : 'outline'}>{x.status ?? '—'}</Badge> },
   { key: 'actions', header: 'Actions', searchable: false, render: (x) => (((x.role === 'Student' && can('cadenza_students:manage')) || (x.role === 'Instructor' && can('cadenza_instructors:manage'))) ? <Button size="sm" variant="outline" onClick={() => setEditing(x)}>Edit</Button> : null) },
 ]
 return <div className="space-y-6">
   <PageHeader title="Users" description="Cadenza students and instructors." actions={<Button disabled={register.isPending} onClick={() => register.mutate()}>{register.isPending ? 'Registering…' : 'Register my account as student'}</Button>} />
   {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
   <Card><CardContent className="pt-6"><DataTable columns={columns} rows={entries} searchPlaceholder="Search users…" /></CardContent></Card>
   <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Update person</DialogTitle></DialogHeader><div className="grid gap-4">{editing?.role === 'Instructor' && <div className="grid gap-2"><Label>Specialty</Label><Input value={editing.specialty ?? ''} onChange={(e) => setEditing({ ...editing, specialty: e.currentTarget.value })} /></div>}<SelectField label="Status" options={['ACTIVE', 'INACTIVE'].map((x) => ({ value: x, label: x }))} value={editing?.status} onChange={(v) => setEditing({ ...editing, status: v })} /></div><DialogFooter><Button onClick={() => editing.role === 'Student' ? updateStudent.mutate({ id: editing.id, status: editing.status }) : updateInstructor.mutate({ id: editing.id, status: editing.status, specialty: editing.specialty })}>{updateStudent.isPending || updateInstructor.isPending ? 'Saving…' : 'Save'}</Button></DialogFooter></DialogContent></Dialog>
 </div>
}
