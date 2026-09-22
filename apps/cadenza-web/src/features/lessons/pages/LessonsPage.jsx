import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, FileInput, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { lessonsApi } from '../api/lessons.api'
import { studentsApi } from '../../students/api/students.api'
import { paymentsApi } from '../../payments/api/payments.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (r) => r?.data ?? r ?? []
const readBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file) })

export default function LessonsPage() {
  const { can } = useAuthorization()
  const client = useQueryClient()
  const canCreate = can('cadenza_lessons:create')
  const canEnroll = can('cadenza_enrollments:create')
  const canManage = can('cadenza_lessons:manage')
  const packagesQuery = useQuery({ queryKey:['cadenza','lesson-packages'], queryFn:lessonsApi.listPackages })
  const studentsQuery = useQuery({ queryKey:['cadenza','students'], queryFn:studentsApi.list })
  const enrollmentsQuery = useQuery({ queryKey:['cadenza','enrollments'], queryFn:lessonsApi.listEnrollments })
  const [packageOpen,setPackageOpen]=useState(false), [enrollOpen,setEnrollOpen]=useState(false), [attachmentPackage,setAttachmentPackage]=useState(null), [payment,setPayment]=useState(null), [file,setFile]=useState(null)
  const [form,setForm]=useState({name:'',description:'',price:'',numberOfSessions:1})
  const [enrollForm,setEnrollForm]=useState({studentId:null,lessonPackageId:null})
  const create=useMutation({mutationFn:lessonsApi.createPackage,onSuccess:()=>{setPackageOpen(false);client.invalidateQueries({queryKey:['cadenza','lesson-packages']})}})
  const enroll=useMutation({mutationFn:lessonsApi.enroll,onSuccess:(r)=>{setEnrollOpen(false);client.invalidateQueries({queryKey:['cadenza','enrollments']});const v=r?.data??r;if(v?.paymentObligationId)setPayment(v)}})
  const attach=useMutation({mutationFn:async({packageId,selectedFile})=>lessonsApi.addAttachment(packageId,{fileName:selectedFile.name,contentBase64:await readBase64(selectedFile),contentType:selectedFile.type||'application/pdf',type:'PDF'}),onSuccess:()=>{setAttachmentPackage(null);setFile(null);client.invalidateQueries({queryKey:['cadenza','lesson-packages']})}})
  const pay=useMutation({mutationFn:({id,amount})=>paymentsApi.pay(id,{amount:String(amount),currency:'PHP',method:'CASH'}),onSuccess:()=>{setPayment(null);client.invalidateQueries({queryKey:['cadenza','enrollments']})}})
  const online=useMutation({mutationFn:({id,amount})=>paymentsApi.checkout(id,{amount:String(amount),description:'Cadenza lesson enrollment'}),onSuccess:()=>client.invalidateQueries({queryKey:['cadenza','enrollments']})})
  const paymentHistory=useQuery({queryKey:['cadenza','payment-history',payment?.paymentObligationId],queryFn:()=>paymentsApi.history(payment.paymentObligationId),enabled:Boolean(payment?.paymentObligationId)})
  const attachmentsQuery=useQuery({queryKey:['cadenza','attachments',attachmentPackage?.id],queryFn:()=>lessonsApi.listAttachments(attachmentPackage.id),enabled:Boolean(attachmentPackage?.id)})
  const deleteAttachment=useMutation({mutationFn:({packageId,id})=>lessonsApi.deleteAttachment(packageId,id),onSuccess:()=>client.invalidateQueries({queryKey:['cadenza','attachments',attachmentPackage?.id]})})
  const obligationQuery=useQuery({queryKey:['cadenza','payment',payment?.paymentObligationId],queryFn:()=>paymentsApi.get(payment.paymentObligationId),enabled:Boolean(payment?.paymentObligationId)})
  if(packagesQuery.isLoading)return <LoadingState label="Loading lesson packages…" rows={3}/>
  if(packagesQuery.error)return <Alert color="red">{packagesQuery.error.message}</Alert>
  const packages=unwrap(packagesQuery.data),students=unwrap(studentsQuery.data),enrollments=unwrap(enrollmentsQuery.data)
  const obligation=obligationQuery.data?.data??obligationQuery.data
  const due=obligation?.balanceDue??obligation?.totalAmount??payment?.amount
  return <Stack gap="lg"><Group justify="space-between"><div><Title order={2}>Music Lessons</Title><Text c="dimmed">Packages, materials, enrollments, and full-payment registration.</Text></div><Group>{canEnroll&&<Button variant="light" onClick={()=>setEnrollOpen(true)}>Enroll</Button>}{canCreate&&<Button onClick={()=>setPackageOpen(true)}>Create package</Button>}</Group></Group>
    {(create.error||enroll.error||attach.error||pay.error||online.error)&&<Alert color="red">{(create.error||enroll.error||attach.error||pay.error||online.error).message}</Alert>}
    <SimpleGrid cols={{base:1,sm:2,lg:3}}>{packages.map(p=><Card key={p.id} withBorder><Stack><Group justify="space-between"><Title order={4}>{p.name}</Title><Badge>{p.status}</Badge></Group><Text>{p.numberOfSessions} sessions</Text><Text fw={700}>₱{Number(p.price).toLocaleString()}</Text><Text size="sm" c="dimmed">{p._count?.attachments??0} attachment(s)</Text>{canManage&&<Button size="xs" onClick={()=>setAttachmentPackage(p)}>Attach PDF</Button>}</Stack></Card>)}</SimpleGrid>
    <Card withBorder><Title order={4}>Enrollments</Title><Stack mt="sm">{enrollments.slice(0,10).map(e=><Group key={e.id} justify="space-between"><Text size="sm">{e.lessonPackage?.name??e.lessonPackageId}</Text><Badge>{e.status}</Badge><Text size="xs">{e.progress?.completedSessions ?? 0}/{e.progress?.totalSessions ?? 0} sessions completed</Text></Group>)}</Stack></Card>
    <Modal opened={packageOpen} onClose={()=>setPackageOpen(false)} title="Create lesson package"><Stack><TextInput label="Name" value={form.name} onChange={e=>setForm({...form,name:e.currentTarget.value})}/><Textarea label="Description" value={form.description} onChange={e=>setForm({...form,description:e.currentTarget.value})}/><NumberInput label="Price" min={0.01} value={form.price} onChange={v=>setForm({...form,price:v})}/><NumberInput label="Sessions" min={1} value={form.numberOfSessions} onChange={v=>setForm({...form,numberOfSessions:v})}/><Button loading={create.isPending} disabled={!form.name||!form.price} onClick={()=>create.mutate({...form,price:String(form.price),numberOfSessions:Number(form.numberOfSessions)})}>Create</Button></Stack></Modal>
    <Modal opened={enrollOpen} onClose={()=>setEnrollOpen(false)} title="Enroll student"><Stack><Select label="Student" data={students.map(s=>({value:s.id,label:s.person?.name??s.person?.fullName??s.id}))} value={enrollForm.studentId} onChange={v=>setEnrollForm({...enrollForm,studentId:v})}/><Select label="Package" data={packages.filter(p=>p.status==='ACTIVE').map(p=>({value:p.id,label:p.name}))} value={enrollForm.lessonPackageId} onChange={v=>setEnrollForm({...enrollForm,lessonPackageId:v})}/><Button loading={enroll.isPending} disabled={!enrollForm.lessonPackageId} onClick={()=>enroll.mutate(enrollForm)}>Create full-payment enrollment</Button></Stack></Modal>
    <Modal opened={Boolean(attachmentPackage)} onClose={()=>setAttachmentPackage(null)} title="Lesson materials"><Stack>{(attachmentsQuery.data?.data??attachmentsQuery.data??[]).map((item)=><Group key={item.id} justify="space-between"><Text size="sm">{item.metadata?.fileName??item.type}</Text><Group><Button size="xs" variant="light" onClick={async()=>{const response=await lessonsApi.getAttachmentUrl(attachmentPackage.id,item.id);const value=response?.data??response;if(value?.url)window.open(value.url,'_blank','noopener,noreferrer')}}>View</Button>{canManage&&<Button size="xs" color="red" variant="subtle" onClick={()=>deleteAttachment.mutate({packageId:attachmentPackage.id,id:item.id})}>Delete</Button>}</Group></Group>)}<FileInput value={file} onChange={setFile} accept="application/pdf"/><Button loading={attach.isPending} disabled={!file} onClick={()=>attach.mutate({packageId:attachmentPackage.id,selectedFile:file})}>Upload</Button></Stack></Modal>
    <Modal opened={Boolean(payment)} onClose={()=>setPayment(null)} title="Lesson payment"><Stack><Text>Enrollment requires full payment.</Text><Text fw={700}>Balance: ₱{Number(due||0).toLocaleString()}</Text>{(paymentHistory.data?.data??paymentHistory.data??[]).map((entry)=><Text key={entry.id} size="xs">{new Date(entry.createdAt).toLocaleString()} — ₱{Number(entry.amount).toLocaleString()} — {entry.status}</Text>)}<Button loading={pay.isPending} disabled={!due} onClick={()=>pay.mutate({id:payment.paymentObligationId,amount:due})}>Record full payment</Button><Button variant="light" loading={online.isPending} disabled={!due} onClick={()=>online.mutate({id:payment.paymentObligationId,amount:due})}>Pay online</Button></Stack></Modal>
  </Stack>
}
