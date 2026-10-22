import { useEffect, useMemo, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
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

const studentName = (student) => student?.name?.trim() || 'Unnamed Student';
const formatStatus = (value) => value?.replace(/_/g, ' ') || 'Unknown';
const courseNames = (student) =>
  (student?.courses || []).map((course) => course?.name).filter(Boolean);
const instructorNames = (student) =>
  (student?.instructors || []).filter(Boolean);

export default function FrontDeskStudentsPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [instructorFilter, setInstructorFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getStudents({ page, limit: 10 })
      .then((result) => {
        if (mounted) {
          setStudents(result.items);
          setPagination(result.pagination);
        }
      })
      .catch(
        (err) =>
          mounted &&
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to load students.',
          ),
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [page]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter(
      (student) =>
        (courseFilter === 'All' ||
          courseNames(student).includes(courseFilter)) &&
        (instructorFilter === 'All' ||
          instructorNames(student).includes(instructorFilter)) &&
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
  }, [search, students, courseFilter, instructorFilter]);
  const courses = [...new Set(students.flatMap(courseNames))].sort();
  const instructors = [...new Set(students.flatMap(instructorNames))].sort();

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
                    <Badge>{formatStatus(enrollment.status)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
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
              Only students with an active enrollment are shown.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
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
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option>All</option>
                  {courses.map((course) => (
                    <option key={course}>{course}</option>
                  ))}
                </select>
                <select
                  value={instructorFilter}
                  onChange={(event) => setInstructorFilter(event.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option>All</option>
                  {instructors.map((instructor) => (
                    <option key={instructor}>{instructor}</option>
                  ))}
                </select>
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Loading students...
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
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
                            <Badge
                              variant={
                                student.status === 'ACTIVE'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {formatStatus(student.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedStudent(student)}
                            >
                              View
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
    </SidebarProvider>
  );
}
