import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileIcon, RefreshCwIcon } from 'lucide-react';
import { SearchIcon } from 'lucide-react';
import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { getStudents } from '@/services/admin/studentService';
import { getRooms } from '@/services/admin/roomsService';
import { enrollmentService } from '@/services/front-desk/enrollmentService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

const studentName = (student) => student?.name?.trim() || 'Unnamed Student';
const formatStatus = (value) => value?.replace(/_/g, ' ') || 'Unknown';
const statusDotClass = (value) =>
  String(value || '').toUpperCase() === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500';
const courseNames = (student) =>
  (student?.courses || []).map((course) => course?.name).filter(Boolean);
const instructorNames = (student) =>
  (student?.instructors || []).filter(Boolean);
const assignedRoomIds = (student) =>
  (student?.enrollments || [])
    .flatMap((enrollment) => enrollment.sessions || [])
    .map((session) => session.roomId)
    .filter(Boolean);

export default function FrontDeskStudentsPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completionEnrollment, setCompletionEnrollment] = useState(null);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [notifyEnrollment, setNotifyEnrollment] = useState(null);
  const [notifySaving, setNotifySaving] = useState(false);
  const [rooms, setRooms] = useState([]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, roomList] = await Promise.all([
        getStudents({ page, limit: 10 }),
        getRooms(),
      ]);
      setStudents(result.items);
      setPagination(result.pagination);
      setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load students.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter(
      (student) =>
        (courseFilter === 'All' ||
          courseNames(student).includes(courseFilter)) &&
        (instructorFilter === 'All' ||
          instructorNames(student).includes(instructorFilter)) &&
        (statusFilter === 'ALL' || String(student.status || '').toUpperCase() === statusFilter) &&
        (!query ||
          [
            studentName(student),
            student.email,
            student.phone,
            ...courseNames(student),
            ...instructorNames(student),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query)),
    );
  }, [search, students, courseFilter, instructorFilter, statusFilter]);
  const courses = [...new Set(students.flatMap(courseNames))].sort();
  const instructors = [...new Set(students.flatMap(instructorNames))].sort();
  const roomNames = new Map(rooms.map((room) => [
    room.id,
    room.roomName || room.resource?.name || room.roomType,
  ]));

  const confirmCompletion = async () => {
    if (!completionEnrollment) return;
    try {
      setCompletionSaving(true);
      await enrollmentService.updateEnrollmentStatus(completionEnrollment.id, 'COMPLETED');
      setSelectedStudent((current) => current ? {
        ...current,
        enrollments: current.enrollments.map((item) => item.id === completionEnrollment.id ? { ...item, status: 'COMPLETED' } : item),
      } : current);
      setCompletionEnrollment(null);
      toast.success('Enrollment marked as completed.');
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to complete enrollment.';
      setError(message);
      toast.error(message);
    } finally {
      setCompletionSaving(false);
    }
  };

  const notifyAtRisk = async () => {
    if (!notifyEnrollment) return;
    try {
      setNotifySaving(true);
      await enrollmentService.notifyEnrollmentAtRisk(notifyEnrollment.id);
      setNotifyEnrollment(null);
      toast.success('At Risk notification sent to the student.');
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to notify the student.';
      setError(message);
      toast.error(message);
    } finally {
      setNotifySaving(false);
    }
  };

  if (selectedStudent)
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
            <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Student profile</p>
                <h2 className="text-2xl font-semibold">
                  {studentName(selectedStudent)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Review personal details, courses, and enrollments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedStudent.status === 'ACTIVE'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {formatStatus(selectedStudent.status)}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStudent(null)}
                >
                  Back to students
                </Button>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p>
                    <span className="text-sm text-muted-foreground">Email</span>
                    <br />
                    {selectedStudent.email || '—'}
                  </p>
                  <p>
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <br />
                    {selectedStudent.phone || '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Learning Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p>
                    <span className="text-sm text-muted-foreground">
                      Courses
                    </span>
                    <br />
                    {courseNames(selectedStudent).join(', ') || '—'}
                  </p>
                  <p>
                    <span className="text-sm text-muted-foreground">
                      Instructors
                    </span>
                    <br />
                    {instructorNames(selectedStudent).join(', ') || '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStudent.enrollments?.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="mb-3 flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {enrollment.packageName || 'Enrollment'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(enrollment.courses || [])
                          .map((course) => course.name)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                    <Badge className="gap-1.5"><span aria-hidden="true" className={`size-1.5 rounded-full ${statusDotClass(enrollment.status)}`} />{formatStatus(enrollment.status)}</Badge>
                    {enrollment.status === 'READY_TO_COMPLETE' && (
                      <Button type="button" size="sm" onClick={() => setCompletionEnrollment(enrollment)}>
                        Confirm completion
                      </Button>
                    )}
                    {enrollment.status === 'AT_RISK' && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setNotifyEnrollment(enrollment)}>
                        Notify student
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
        <Dialog open={Boolean(notifyEnrollment)} onOpenChange={(open) => !open && setNotifyEnrollment(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Notify student about At Risk enrollment?</DialogTitle>
              <DialogDescription>
                This sends the standard At Risk message through the student&apos;s in-app notification and email channels.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNotifyEnrollment(null)} disabled={notifySaving}>Cancel</Button>
              <Button type="button" onClick={notifyAtRisk} disabled={notifySaving}>{notifySaving ? 'Sending...' : 'Send notification'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    );

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Students</h1>
            <p className="text-muted-foreground">
              All student accounts are shown; course summaries use approved enrollments.
            </p>
            <Button variant="outline" onClick={loadStudents} disabled={loading}>
              <RefreshCwIcon className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>
              <CardDescription>
                Students are loaded from the backend with pagination.
              </CardDescription>
              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search this page..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor="frontdesk-course-filter">Course</label>
                  <select id="frontdesk-course-filter" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>All</option>{courses.map((course) => <option key={course}>{course}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor="frontdesk-instructor-filter">Instructor</label>
                  <select id="frontdesk-instructor-filter" value={instructorFilter} onChange={(event) => setInstructorFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>All</option>{instructors.map((instructor) => <option key={instructor}>{instructor}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" htmlFor="frontdesk-student-status-filter">Status</label>
                  <select id="frontdesk-student-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="AT_RISK">At Risk</option>
                    <option value="READY_TO_COMPLETE">Ready to complete</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <p className="mb-4 text-sm text-destructive">{error}</p>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Assigned Room</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Loading students...
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No enrolled students found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="font-medium">
                              {studentName(student)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {student.email || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {courseNames(student).join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            {instructorNames(student).join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            {[...new Set(assignedRoomIds(student).map((id) => roomNames.get(id)).filter(Boolean))].join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className="gap-1.5"
                              variant={
                                student.status === 'ACTIVE'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              <span aria-hidden="true" className={`size-1.5 rounded-full ${statusDotClass(student.status)}`} />
                              {formatStatus(student.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title="View student details"
                              aria-label="View student details"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <FileIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                <span>{pagination?.total || 0} enrolled students</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination?.hasPreviousPage || loading}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {pagination?.page || page} of {pagination?.pages || 0}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination?.hasNextPage || loading}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
      <Dialog open={Boolean(completionEnrollment)} onOpenChange={(open) => !open && setCompletionEnrollment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm enrollment completion?</DialogTitle>
            <DialogDescription>
              This will mark {completionEnrollment?.packageName || 'this enrollment'} as completed. The student account and enrollment history will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompletionEnrollment(null)} disabled={completionSaving}>Cancel</Button>
            <Button type="button" onClick={confirmCompletion} disabled={completionSaving}>{completionSaving ? 'Saving...' : 'Confirm completion'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
