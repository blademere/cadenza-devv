import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Group, Modal, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import LoadingState from '../../../components/common/LoadingState'
import { studentsApi } from '../../students/api/students.api'
import { instructorsApi } from '../../instructors/api/instructors.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'
const unwrap=r=>r?.data??r??[]
export default function UsersPage(){
 const {can}=useAuthorization(),client=useQueryClient(),canInstructorRead=can('cadenza_instructors:read')
 const students=useQuery({queryKey:['cadenza','students'],queryFn:studentsApi.list}),instructors=useQuery({queryKey:['cadenza','instructors'],queryFn:instructorsApi.list})
 const [editing,setEditing]=useState(null)
 const updateStudent=useMutation({mutationFn:({id,status})=>studentsApi.update(id,{status}),onSuccess:()=>{setEditing(null);client.invalidateQueries({queryKey:['cadenza','students']})}})
 const updateInstructor=useMutation({mutationFn:({id,status,specialty})=>instructorsApi.update(id,{status,specialty}),onSuccess:()=>{setEditing(null);client.invalidateQueries({queryKey:['cadenza','instructors']})}})
 const register=useMutation({mutationFn:studentsApi.registerMe,onSuccess:()=>client.invalidateQueries({queryKey:['cadenza','students']})})
 if(students.isLoading||instructors.isLoading)return <LoadingState label="Loading people…" rows={4}/>
 if(students.error||instructors.error)return <Alert color="red">{(students.error||instructors.error).message}</Alert>
 const entries=[...unwrap(students.data).map(x=>({...x,role:'Student'})),...(canInstructorRead?unwrap(instructors.data).map(x=>({...x,role:'Instructor'})):[])]
 return <Stack gap="lg"><Group justify="space-between"><div><Title order={2}>Users</Title><Text c="dimmed">Cadenza students and instructors.</Text></div><Button loading={register.isPending} onClick={()=>register.mutate()}>Register my account as student</Button></Group>
 <SimpleGrid cols={{base:1,sm:2,lg:3}}>{entries.map(x=><Card key={x.id} withBorder><Group justify="space-between"><div><Text fw={600}>{x.person?.name??x.person?.fullName??x.personId??x.id}</Text>{x.specialty&&<Text size="sm" c="dimmed">{x.specialty}</Text>}</div><Badge>{x.role}</Badge>{((x.role==='Student'&&can('cadenza_students:manage'))||(x.role==='Instructor'&&can('cadenza_instructors:manage')))&&<Button size="xs" onClick={()=>setEditing(x)}>Edit</Button>}</Group></Card>)}</SimpleGrid>
 <Modal opened={Boolean(editing)} onClose={()=>setEditing(null)} title="Update person"><Stack>{editing?.role==='Instructor'&&<TextInput label="Specialty" value={editing.specialty??''} onChange={e=>setEditing({...editing,specialty:e.currentTarget.value})}/>}<Select label="Status" data={['ACTIVE','INACTIVE']} value={editing?.status??null} onChange={v=>setEditing({...editing,status:v})}/><Button loading={updateStudent.isPending||updateInstructor.isPending} onClick={()=>editing.role==='Student'?updateStudent.mutate({id:editing.id,status:editing.status}):updateInstructor.mutate({id:editing.id,status:editing.status,specialty:editing.specialty})}>Save</Button></Stack></Modal>
 </Stack>
}
