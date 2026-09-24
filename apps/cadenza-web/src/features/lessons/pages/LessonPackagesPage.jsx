import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import DataTable from '../../../components/data-table'
import LoadingState from '../../../components/loading-state'
import PageHeader from '../../../components/page-header'
import { lessonsApi } from '../api/lessons.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []
const money = (value) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const readBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file) })

export default function LessonPackagesPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreate = can('cadenza_lessons:create')
  const canManage = can('cadenza_lessons:manage')
  const [createOpen, setCreateOpen] = useState(false)
  const [materialsPackage, setMaterialsPackage] = useState(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', numberOfSessions: 1, sessionDurationMinutes: 60 })
  const packagesQuery = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })
  const attachmentsQuery = useQuery({ queryKey: ['cadenza', 'attachments', materialsPackage?.id], queryFn: () => lessonsApi.listAttachments(materialsPackage.id), enabled: Boolean(materialsPackage?.id) })

  const create = useMutation({ mutationFn: lessonsApi.createPackage, onSuccess: () => { setCreateOpen(false); setForm({ name: '', description: '', price: '', numberOfSessions: 1, sessionDurationMinutes: 60 }); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] }) } })
  const upload = useMutation({ mutationFn: async ({ packageId, selectedFile }) => lessonsApi.addAttachment(packageId, { fileName: selectedFile.name, contentBase64: await readBase64(selectedFile), contentType: selectedFile.type || 'application/pdf', type: 'PDF' }), onSuccess: () => { setFile(null); client.invalidateQueries({ queryKey: ['cadenza', 'attachments', materialsPackage?.id] }); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] }) } })
  const remove = useMutation({ mutationFn: ({ packageId, id }) => lessonsApi.deleteAttachment(packageId, id), onSuccess: () => client.invalidateQueries({ queryKey: ['cadenza', 'attachments', materialsPackage?.id] }) })

  if (packagesQuery.isLoading) return <LoadingState label="Loading lesson packages…" rows={5} />
  if (packagesQuery.error) return <Alert variant="destructive"><AlertDescription>{packagesQuery.error.message}</AlertDescription></Alert>
  const packages = unwrap(packagesQuery.data)
  const error = create.error || upload.error || remove.error

  return <div className="space-y-6">
    <PageHeader title="Lesson Packages" description="Manage the lesson catalog, pricing, session counts, and teaching materials." actions={canCreate ? <Button onClick={() => setCreateOpen(true)}>Create package</Button> : null} />
    {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
    <div className="grid gap-4 sm:grid-cols-3"><Summary label="Total packages" value={packages.length} /><Summary label="Active" value={packages.filter((item) => item.status === 'ACTIVE').length} /><Summary label="Materials" value={packages.reduce((sum, item) => sum + (item._count?.attachments ?? 0), 0)} /></div>
    <Card><CardContent className="pt-6"><DataTable columns={[
      { key: 'name', header: 'Package', value: (item) => item.name },
      { key: 'sessions', header: 'Sessions', value: (item) => item.numberOfSessions },
      { key: 'duration', header: 'Duration', value: (item) => `${item.sessionDurationMinutes ?? 60} min` },
      { key: 'price', header: 'Price', value: (item) => money(item.price) },
      { key: 'status', header: 'Status', render: (item) => <Badge variant="secondary">{item.status}</Badge> },
      { key: 'materials', header: 'Materials', value: (item) => item._count?.attachments ?? 0 },
      { key: 'actions', header: 'Actions', searchable: false, render: (item) => canManage ? <Button size="sm" variant="outline" onClick={() => setMaterialsPackage(item)}>Manage materials</Button> : null },
    ]} rows={packages} searchPlaceholder="Search lesson packages…" /></CardContent></Card>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create lesson package</DialogTitle><DialogDescription>Define what customers can purchase and how many sessions it includes.</DialogDescription></DialogHeader>
      <div className="grid gap-4">
        <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} /></Field>
        <Field label="Price"><Input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.currentTarget.value })} /></Field>
        <Field label="Sessions"><Input type="number" min="1" value={form.numberOfSessions} onChange={(e) => setForm({ ...form, numberOfSessions: e.currentTarget.value })} /></Field>
        <Field label="Session duration (minutes)"><Input type="number" min="15" max="480" step="15" value={form.sessionDurationMinutes} onChange={(e) => setForm({ ...form, sessionDurationMinutes: e.currentTarget.value })} /></Field>
      </div>
      <DialogFooter><Button disabled={!form.name || !form.price || create.isPending} onClick={() => create.mutate({ ...form, price: String(form.price), numberOfSessions: Number(form.numberOfSessions), sessionDurationMinutes: Number(form.sessionDurationMinutes) })}>{create.isPending ? 'Creating…' : 'Create package'}</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={Boolean(materialsPackage)} onOpenChange={(open) => !open && setMaterialsPackage(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Lesson materials</DialogTitle><DialogDescription>PDF materials attached to {materialsPackage?.name ?? 'this package'}.</DialogDescription></DialogHeader>
      <div className="grid gap-4">{attachmentsQuery.isLoading ? <LoadingState label="Loading materials…" rows={2} /> : (unwrap(attachmentsQuery.data).length ? unwrap(attachmentsQuery.data).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><span className="min-w-0 truncate text-sm">{item.metadata?.fileName ?? item.type}</span><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={async () => { const response = await lessonsApi.getAttachmentUrl(materialsPackage.id, item.id); const value = response?.data ?? response; if (value?.url) window.open(value.url, '_blank', 'noopener,noreferrer') }}>View</Button><Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate({ packageId: materialsPackage.id, id: item.id })}>Delete</Button></div></div>) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No materials uploaded yet.</p>)}<Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><Button disabled={!file || upload.isPending} onClick={() => upload.mutate({ packageId: materialsPackage.id, selectedFile: file })}>{upload.isPending ? 'Uploading…' : 'Upload PDF'}</Button></div>
    </DialogContent></Dialog>
  </div>
}
function Summary({ label, value }) { return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card> }
function Field({ label, children }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div> }
