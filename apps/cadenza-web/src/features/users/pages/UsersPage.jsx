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
  const canStudentManage = can('cadenza_students:manage')

  const students = useQuery({
    queryKey: ['cadenza', 'students'],
    queryFn: studentsApi.list,
  })
  const instructors = useQuery({
    queryKey: ['cadenza', 'instructors'],
    queryFn: instructorsApi.list,
    enabled: canInstructorRead,
  })
  const candidates = useQuery({
    queryKey: ['cadenza', 'instructor-candidates'],
    queryFn: instructorsApi.listCandidates,
    enabled: canInstructorCreate,
  })

  const [editing, setEditing] = useState(null)
  const [addInstructorOpen, setAddInstructorOpen] = useState(false)
  const [newInstructor, setNewInstructor] = useState({ personId: '', specialty: '' })

  const updateStudent = useMutation({
    mutationFn: ({ id, status }) => studentsApi.update(id, { status }),
    onSuccess: () => {
      setEditing(null)
      client.invalidateQueries({ queryKey: ['cadenza', 'students'] })
    },
  })

  const updateInstructor = useMutation({
    mutationFn: ({ id, status, specialty }) => instructorsApi.update(id, { status, specialty }),
    onSuccess: () => {
      setEditing(null)
      client.invalidateQueries({ queryKey: ['cadenza', 'instructors'] })
    },
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

  const register = useMutation({
    mutationFn: studentsApi.registerMe,
    onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'students'] }),
  })

  if (students.isLoading || (canInstructorRead && instructors.isLoading)) {
    return <LoadingState label="Loading people…" rows={4} />
  }

  if (students.error || instructors.error) {
    return <Alert variant="destructive"><AlertDescription>{(students.error || instructors.error).message}</AlertDescription></Alert>
  }

  const entries = [
    ...unwrap(students.data).map((x) => ({ ...x, role: 'Student' })),
    ...(canInstructorRead ? unwrap(instructors.data).map((x) => ({ ...x, role: 'Instructor' })) : []),
  ]

  const error = updateStudent.error || updateInstructor.error || createInstructor.error || register.error || candidates.error
  const candidateOptions = unwrap(candidates.data).map((person) => ({
    value: person.id,
    label: personName(person) + (person.email ? ` — ${person.email}` : ''),
  }))

  const columns = [
    { key: 'name', header: 'Name', value: (x) => personName(x.person) },
    { key: 'email', header: 'Email', value: (x) => x.person?.email ?? '—' },
    { key: 'role', header: 'Role', render: (x) => <Badge variant="secondary">{x.role}</Badge> },
    { key: 'specialty', header: 'Specialty', value: (x) => x.specialty ?? '—' },
    { key: 'status', header: 'Status', render: (x) => <Badge variant={x.status === 'ACTIVE' ? 'default' : 'outline'}>{x.status ?? '—'}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      searchable: false,
      render: (x) =>
        ((x.role === 'Student' && canStudentManage) || (x.role === 'Instructor' && canInstructorManage))
          ? <Button size="sm" variant="outline" onClick={() => setEditing(x)}>Edit</Button>
          : null,
    },
  ]

  return <div className="space-y-6">
    <PageHeader
      title="Users"
      description="Cadenza students and instructors."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button disabled={register.isPending} onClick={() => register.mutate()}>
            {register.isPending ? 'Registering…' : 'Register my account as student'}
          </Button>
          {canInstructorCreate && (
            <Button variant="outline" onClick={() => setAddInstructorOpen(true)}>
              Add instructor
            </Button>
          )}
        </div>
      }
    />

    {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}

    <Card>
      <CardContent className="pt-6">
        <DataTable columns={columns} rows={entries} searchPlaceholder="Search users…" />
      </CardContent>
    </Card>

    <Dialog open={addInstructorOpen} onOpenChange={setAddInstructorOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add instructor</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <SelectField
            label="Person"
            options={candidateOptions}
            value={newInstructor.personId}
            onChange={(value) => setNewInstructor({ ...newInstructor, personId: value })}
          />
          <div className="grid gap-2">
            <Label htmlFor="instructor-specialty">Specialty</Label>
            <Input
              id="instructor-specialty"
              value={newInstructor.specialty}
              onChange={(e) => setNewInstructor({ ...newInstructor, specialty: e.currentTarget.value })}
              placeholder="e.g. Piano, Guitar, Vocal"
              maxLength={100}
            />
          </div>
          {candidates.isLoading && <p className="text-sm text-muted-foreground">Loading eligible people…</p>}
          {!candidates.isLoading && !candidates.error && candidateOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No eligible people are available to add as an instructor.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddInstructorOpen(false)}>Cancel</Button>
          <Button
            disabled={!newInstructor.personId || createInstructor.isPending}
            onClick={() => createInstructor.mutate({
              personId: newInstructor.personId,
              specialty: newInstructor.specialty || undefined,
            })}
          >
            {createInstructor.isPending ? 'Adding…' : 'Add instructor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Update {editing?.role?.toLowerCase()}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          {editing?.role === 'Instructor' && (
            <div className="grid gap-2">
              <Label>Specialty</Label>
              <Input
                value={editing.specialty ?? ''}
                onChange={(e) => setEditing({ ...editing, specialty: e.currentTarget.value })}
              />
            </div>
          )}
          <SelectField
            label="Status"
            options={['ACTIVE', 'INACTIVE'].map((x) => ({ value: x, label: x }))}
            value={editing?.status}
            onChange={(value) => setEditing({ ...editing, status: value })}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() =>
              editing.role === 'Student'
                ? updateStudent.mutate({ id: editing.id, status: editing.status })
                : updateInstructor.mutate({
                    id: editing.id,
                    status: editing.status,
                    specialty: editing.specialty,
                  })
            }
          >
            {updateStudent.isPending || updateInstructor.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
