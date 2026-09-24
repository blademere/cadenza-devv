import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { lessonsApi } from '../api/lessons.api'
import { schedulingApi } from '../../scheduling/api/scheduling.api'
import { useAuthorization } from '../../authorization/components/AuthorizationProvider'

const unwrap = (value) => value?.data ?? value ?? []

export default function LessonManagementPage() {
  const { can } = useAuthorization()
  const canPackages = can('cadenza_lessons:read') || can('cadenza_lessons:create') || can('cadenza_lessons:manage')
  const canEnrollments = can('cadenza_enrollments:read') || can('cadenza_enrollments:create') || can('cadenza_enrollments:manage')
  const canSchedule = can('cadenza_lessons:schedule') || can('cadenza_lessons:attendance') || can('cadenza_lessons:manage')
  const packages = useQuery({ queryKey: ['cadenza', 'lesson-packages'], queryFn: lessonsApi.listPackages, enabled: canPackages })
  const enrollments = useQuery({ queryKey: ['cadenza', 'enrollments'], queryFn: lessonsApi.listEnrollments, enabled: canEnrollments })
  const sessions = useQuery({ queryKey: ['cadenza', 'sessions'], queryFn: schedulingApi.listSessions, enabled: canSchedule })
  if (packages.isLoading || enrollments.isLoading || sessions.isLoading) return <LoadingState label="Loading lesson operations…" rows={4} />
  const error = packages.error || enrollments.error || sessions.error
  if (error) return <p className="text-sm text-destructive">{error.message}</p>
  const packageRows = unwrap(packages.data)
  const enrollmentRows = unwrap(enrollments.data)
  const sessionRows = unwrap(sessions.data)
  const cards = [
    { title: 'Lesson Packages', description: 'Manage packages, pricing, session counts, and PDF materials.', count: packageRows.length, route: '/app/lesson-packages', permission: can('cadenza_lessons:read') || can('cadenza_lessons:create') || can('cadenza_lessons:manage') },
    { title: 'Enrollments', description: 'Register customers, monitor payment, and review enrollment progress.', count: enrollmentRows.length, route: '/app/lesson-enrollments', permission: can('cadenza_enrollments:read') || can('cadenza_enrollments:create') || can('cadenza_enrollments:manage') },
    { title: 'Schedule & Sessions', description: 'Assign instructors and rooms, manage sessions, attendance, and reschedules.', count: sessionRows.length, route: '/app/lesson-schedule', permission: can('cadenza_lessons:schedule') || can('cadenza_lessons:attendance') || can('cadenza_lessons:manage') },
  ].filter((item) => item.permission)
  return <div className="space-y-6">
    <PageHeader title="Lesson Operations" description="Choose the lesson workflow you need. Each area is focused on one operational task." />
    <div className="grid gap-5 lg:grid-cols-3">
      {cards.map((item) => <Card key={item.route} className="flex h-full flex-col"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">{item.title}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{item.description}</p></div><Badge variant="outline">{item.count}</Badge></CardHeader><CardContent className="mt-auto"><Button asChild className="w-full"><Link to={item.route}>Open {item.title}</Link></Button></CardContent></Card>)}
    </div>
  </div>
}