import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, FileInput, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { lessonsApi } from '../api/lessons.api'
import { studentsApi } from '../../students/api/students.api'
import { paymentsApi }
import { useAuthorization } from '../../../features/authorization/components/AuthorizationProvider' from '../../payments/api/payments.api'

const unwrap = (response) => response?.data ?? response ?? []

const readBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function LessonsPage() {\n  const { can } = useAuthorization()\n  const canCreate = can('cadenza_lessons:create')\n  const canEnroll = can('cadenza_enrollments:create')
  const client = useQueryClient()
  const packagesQuery = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages })
  const studentsQuery = useQuery({ queryKey: ['cadenza', 'students'], queryFn: studentsApi.list })
  const enrollmentsQuery = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments })
  const [opened, setOpened] = useState(false)
  const [enrollOpened, setEnrollOpened] = useState(false)
  const [attachmentOpened, setAttachmentOpened] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', numberOfSessions: 1 })
  const [enrollForm, setEnrollForm] = useState({ studentId: null, lessonPackageId: null })
  const [file, setFile] = useState(null)
  const [attachmentType, setAttachmentType] = useState('PDF')
  const [payment, setPayment] = useState(null)
  const create = useMutation({ mutationFn: lessonsApi.createPackage, onSuccess: () => { setOpened(false); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] }) } })
  const enroll = useMutation({ mutationFn: lessonsApi.enroll, onSuccess: (response) => { setEnrollOpened(false); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }); const value=response?.data ?? response; if (value?.paymentObligationId) setPayment(value) } })
  const attach = useMutation({ mutationFn: async ({ packageId, selectedFile }) => lessonsApi.addAttachment(packageId, { fileName: selectedFile.name, contentBase64: await readBase64(selectedFile), contentType: selectedFile.type || 'application/octet-stream', type: attachmentType }), onSuccess: () => { setAttachmentOpened(null); setFile(null); client.invalidateQueries({ queryKey: ['cadenza', 'lesson-packages'] }) } })
  const paymentQuery = useQuery({ queryKey: ['cadenza', 'payment', payment?.paymentObligationId], queryFn: () => paymentsApi.get(payment.paymentObligationId), enabled: Boolean(payment?.paymentObligationId) })
  const checkout = useMutation({ mutationFn: ({ id, amount }) => paymentsApi.checkout(id, { amount: String(amount), description: 'Cadenza lesson enrollment' }), onSuccess: () => { setPayment(null); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }) } })
  const pay = useMutation({ mutationFn: ({ id, amount }) => paymentsApi.pay(id, { amount: String(amount), currency: 'PHP', method: 'CASH' }), onSuccess: () => { setPayment(null); client.invalidateQueries({ queryKey: ['cadenza', 'enrollments'] }) } })
  if (packagesQuery.isLoading) return <LoadingState label="Loading lesson packages…" rows={3} />
  if (packagesQuery.error) return <Alert color="red" title="Unable to load lesson packages">{packagesQuery.error.message}</Alert>
  const packages = unwrap(packagesQuery.data)
  const students = unwrap(studentsQuery.data)
  const enrollments = unwrap(enrollmentsQuery.data)
  return <Stack gap="lg">
    <Group justify="space-between">
      <div><Title order={2}>Music Lessons</Title><Text c="dimmed">Lesson packages, attachments, and student enrollments.</Text></div>
      <Group>{canEnroll && <Button variant="light" onClick={() => setEnrollOpened(true)}>Enroll student</Button>}{canCreate && <Button onClick={() => setOpened(true)}>Create lesson package</Button>}</Group>
    </Group>
    {(create.error || enroll.error || attach.error || pay.error) && <Alert color="red" title="Lesson operation failed">{(create.error || enroll.error || attach.error || pay.error).message}</Alert>}
    {!packages.length ? <Alert color="gray" title="No lesson packages">Create a lesson package before accepting enrollments.</Alert> :
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{packages.map((pkg) =>
        <Card key={pkg.id} withBorder radius="md" padding="lg"><Stack gap="sm">
          <Group justify="space-between" align="flex-start"><Title order={4}>{pkg.name}</Title><Badge variant="light">{pkg.status}</Badge></Group>
          <Text c="dimmed">{pkg.numberOfSessions} sessions</Text>
          {pkg.description && <Text size="sm" c="dimmed">{pkg.description}</Text>}
          <Text fw={700} size="lg">₱{Number(pkg.price).toLocaleString()}</Text>
          <Text size="xs" c="dimmed">{pkg._count?.attachments ?? 0} attachment(s)</Text>
          <Group>{canCreate && <Button size="xs" variant="light" onClick={() => setAttachmentOpened(pkg)}>Attach PDF</Button>}</Group>
        </Stack></Card>
      )}</SimpleGrid>}
    <Card withBorder><Stack><Title order={4}>Recent enrollments</Title>{!enrollments.length ? <Text c="dimmed">No enrollments yet.</Text> : enrollments.slice(0,6).map((item) => <Group key={item.id} justify="space-between"><Text size="sm">{item.studentId} · {item.lessonPackageId}</Text><Badge>{item.status}</Badge></Group>)}</Stack></Card>
    <Modal opened={opened} onClose={() => setOpened(false)} title="Create lesson package"><Stack>
      <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
      <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
      <NumberInput label="Price" min={0.01} value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
      <NumberInput label="Number of sessions" min={1} value={form.numberOfSessions} onChange={(value) => setForm({ ...form, numberOfSessions: value })} />
      <Button loading={create.isPending} disabled={!form.name || !form.price} onClick={() => create.mutate({ ...form, price: String(form.price), numberOfSessions: Number(form.numberOfSessions) })}>Create package</Button>
    </Stack></Modal>
    <Modal opened={enrollOpened} onClose={() => setEnrollOpened(false)} title="Enroll student"><Stack>
      <Select label="Student" data={students.map((s) => ({ value: s.id, label: s.person?.name ?? s.person?.fullName ?? s.personId ?? s.id }))} value={enrollForm.studentId} onChange={(value) => setEnrollForm({ ...enrollForm, studentId: value })} />
      <Select label="Lesson package" data={packages.map((p) => ({ value: p.id, label: p.name }))} value={enrollForm.lessonPackageId} onChange={(value) => setEnrollForm({ ...enrollForm, lessonPackageId: value })} />
      <Button loading={enroll.isPending} disabled={!enrollForm.studentId || !enrollForm.lessonPackageId} onClick={() => enroll.mutate(enrollForm)}>Enroll and create full-payment obligation</Button>
    </Stack></Modal>
    <Modal opened={Boolean(attachmentOpened)} onClose={() => setAttachmentOpened(null)} title={`Attach material to ${attachmentOpened?.name ?? ''}`}><Stack>
      <FileInput label="PDF or lesson material" value={file} onChange={setFile} accept="application/pdf" />
      <TextInput label="Attachment type" value={attachmentType} onChange={(e) => setAttachmentType(e.currentTarget.value)} />
      <Button loading={attach.isPending} disabled={!file || !attachmentOpened} onClick={() => attach.mutate({ packageId: attachmentOpened.id, selectedFile: file })}>Upload attachment</Button>
    </Stack></Modal>
    <Modal opened={Boolean(payment)} onClose={() => setPayment(null)} title="Enrollment payment"><Stack>
      <Text>Enrollment requires full payment.</Text>
      <Text fw={700}>Amount due: ₱{Number(payment?.amount ?? payment?.totalAmount ?? 0).toLocaleString()}</Text>
      <Button loading={pay.isPending} disabled={!payment?.paymentObligationId || paymentQuery.isLoading} onClick={() => pay.mutate({ id: payment.paymentObligationId, amount: paymentQuery.data?.totalAmount ?? paymentQuery.data?.data?.totalAmount ?? payment?.amount ?? payment?.totalAmount })}>Record full payment</Button><Button variant="light" loading={checkout.isPending} disabled={!payment?.paymentObligationId || paymentQuery.isLoading} onClick={() => checkout.mutate({ id: payment.paymentObligationId, amount: paymentQuery.data?.totalAmount ?? paymentQuery.data?.data?.totalAmount ?? payment?.amount ?? payment?.totalAmount })}>Pay online</Button>
    </Stack></Modal>
  </Stack>
}
