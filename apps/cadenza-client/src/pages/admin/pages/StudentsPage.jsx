'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  SearchIcon,
  UserIcon,
  UserRoundIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getStudents } from '@/services/admin/studentService';
import { enrollmentService } from '@/services/front-desk/enrollmentService';

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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Failed to load students. Please try again.';

const formatStatus = (status) =>
  status
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Unknown';

const formatStudentId = (id) =>
  id == null ? '-' : `STU-${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const getStudentCourses = (student) =>
  Array.isArray(student?.courses)
    ? student.courses.map((course) => course?.name).filter(Boolean)
    : [];

const getStudentInstructors = (student) =>
  Array.isArray(student?.instructors)
    ? student.instructors.filter(Boolean)
    : [];

const getStudentDisplayName = (student) =>
  student?.name?.trim() || 'Unnamed Student';

const getStatusVariant = (status) =>
  status === 'ACTIVE'
    ? 'default'
    : status === 'SUSPENDED'
      ? 'destructive'
      : status === 'READY_TO_COMPLETE'
        ? 'default'
      : 'secondary';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStudentDetailsDialog, setShowStudentDetails] = useState(false);
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState(null);
  const [notifyingEnrollmentId, setNotifyingEnrollmentId] = useState(null);
  const [pendingEnrollmentAction, setPendingEnrollmentAction] = useState(null);

  const loadStudents = useCallback(async () => {
    let isMounted = true;
    setIsLoading(true);
    setError('');

    try {
      const result = await getStudents({ page, limit: 10 });
      if (isMounted) {
        setStudents(result.items);
        setPagination(result.pagination || { page, pages: 1, total: result.items.length });
      }
    } catch (requestError) {
      if (isMounted) {
        const message = getErrorMessage(requestError);
        setError(message);
        toast.error(message);
        setStudents([]);
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [page]);

  useEffect(() => {
    const cleanup = loadStudents();

    return () => {
      cleanup.then((dispose) => dispose?.());
    };
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return students.filter((student) => {
      if (statusFilter !== 'ALL' && student?.status !== statusFilter) return false;
      if (!normalizedSearch) return true;

      const searchableText = [
        getStudentDisplayName(student),
        student?.email,
        student?.phone,
        student?.status,
        ...getStudentCourses(student),
        ...getStudentInstructors(student),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [search, statusFilter, students]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleStudentDetails = (student) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
  };

  const handleCloseStudentDetails = (open) => {
    setShowStudentDetails(open);

    if (!open) {
      setSelectedStudent(null);
    }
  };

  const updateEnrollmentStatus = async (enrollmentId, status) => {
    try {
      setUpdatingEnrollmentId(enrollmentId);
      const updated = await enrollmentService.updateEnrollmentStatus(enrollmentId, status);
      setSelectedStudent((current) => current ? {
        ...current,
        enrollments: current.enrollments.map((item) => item.id === enrollmentId ? { ...item, status: updated.status } : item),
        status: status === 'AT_RISK' || current.enrollments.some((item) => item.id !== enrollmentId && item.status === 'AT_RISK') ? 'AT_RISK' : current.status,
      } : current);
      setStudents((current) => current.map((student) => student.id === selectedStudent?.id ? { ...student, status: status === 'AT_RISK' ? 'AT_RISK' : student.status } : student));
      toast.success('Enrollment status updated successfully.');
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      toast.error(message);
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const notifyEnrollmentAtRisk = async (enrollmentId) => {
    try {
      setNotifyingEnrollmentId(enrollmentId);
      await enrollmentService.notifyEnrollmentAtRisk(enrollmentId);
      toast.success('Notification sent to the student.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
      setError(getErrorMessage(requestError));
    } finally {
      setNotifyingEnrollmentId(null);
    }
  };

  const confirmEnrollmentAction = async () => {
    const action = pendingEnrollmentAction;
    setPendingEnrollmentAction(null);
    if (!action) return;
    if (action.type === 'notify') return notifyEnrollmentAtRisk(action.enrollmentId);
    return updateEnrollmentStatus(action.enrollmentId, action.status);
  };

  const renderStatusBadge = (status) => (
    <Badge
      variant={getStatusVariant(status)}
      className={status === 'AT_RISK' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}
    >
      {formatStatus(status)}
    </Badge>
  );

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <h1 className="text-2xl font-semibold tracking-tight">Students</h1>

            <p className="text-muted-foreground">
              Manage students with approved enrollments at Cadenza Music Center.
            </p>
            </div>

            <Button variant="outline" onClick={loadStudents} disabled={isLoading}>
              {isLoading && <RefreshCwIcon className="mr-2 size-4 animate-spin" />}
              {!isLoading && <RefreshCwIcon className="mr-2 size-4" />}
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>

              <CardDescription>
                View enrolled students, their courses, and instructors.
              </CardDescription>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex w-full flex-col gap-1 sm:max-w-sm">
                  <label htmlFor="student-search" className="text-sm font-medium">
                    Search
                  </label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="student-search"
                      placeholder="Search students..."
                      className="pl-9"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      aria-label="Search students"
                    />
                  </div>
                </div>
                <div className="flex w-full flex-col gap-1 sm:w-44">
                  <label htmlFor="student-status-filter" className="text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="student-status-filter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
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
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"
                >
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />

                  <div>
                    <p>{error}</p>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={loadStudents}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Loading students...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-16 text-center">
                          Unable to display students.
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {search.trim() || statusFilter !== 'ALL'
                            ? 'No students match your search.'
                            : 'No enrolled students found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => {
                        const courses = getStudentCourses(student);
                        const instructors = getStudentInstructors(student);

                        return (
                          <TableRow key={student.id}>
                            <TableCell>
                              <div className="font-medium">
                                {getStudentDisplayName(student)}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {student.email || '-'}
                              </div>
                            </TableCell>

                            <TableCell>{courses.join(', ') || '-'}</TableCell>

                            <TableCell>
                              {instructors.join(', ') || '-'}
                            </TableCell>

                            <TableCell>
                              {renderStatusBadge(student.status)}
                            </TableCell>

                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Options for ${getStudentDisplayName(student)}`}
                                  >
                                    <MoreHorizontalIcon className="size-4" />
                                    <span className="sr-only">
                                      Student options
                                    </span>
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onClick={() =>
                                      handleStudentDetails(student)
                                    }
                                  >
                                    <UserIcon className="size-4" />
                                    Student Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {!isLoading && !error && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Showing {filteredStudents.length} of {pagination.total} students
                </p>
              )}
              {!isLoading && !error && pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                      Previous
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      <Dialog
        open={showStudentDetailsDialog}
        onOpenChange={handleCloseStudentDetails}
      >
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Student Details</DialogTitle>

            <DialogDescription>
              View the student's account and enrollment information.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            {selectedStudent && (
              <div className="grid gap-5">
                {/* Student Profile */}
                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRoundIcon className="size-7 text-muted-foreground" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-semibold">
                      {getStudentDisplayName(selectedStudent)}
                    </h3>

                    <p className="break-all text-sm text-muted-foreground">
                      {selectedStudent.email || '-'}
                    </p>
                  </div>
                </div>

                {/* Contact and Enrollment Details */}
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <div className="min-w-0 p-4">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="mt-1 break-words font-medium">
                        {selectedStudent.phone || '-'}
                      </p>
                    </div>

                    <div className="min-w-0 p-4">
                      <p className="text-sm text-muted-foreground">Guardian</p>
                      <p className="mt-1 font-medium">Not available</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <div className="min-w-0 p-4">
                      <p className="text-sm text-muted-foreground">Courses</p>
                      <p className="mt-1 break-words font-medium">
                        {getStudentCourses(selectedStudent).join(', ') || '-'}
                      </p>
                    </div>

                    <div className="min-w-0 p-4">
                      <p className="text-sm text-muted-foreground">
                        Instructors
                      </p>
                      <p className="mt-1 break-words font-medium">
                        {getStudentInstructors(selectedStudent).join(', ') ||
                          '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold">
                    Account Information
                  </h4>

                  <div className="overflow-hidden rounded-lg border">
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="shrink-0 text-sm text-muted-foreground">
                        Student ID
                      </span>

                      <span
                        className="text-right text-sm font-medium"
                        title={selectedStudent.id || undefined}
                      >
                        {formatStudentId(selectedStudent.id)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Account Status
                      </span>

                      {renderStatusBadge(selectedStudent.status)}
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Account Active
                      </span>

                      <Badge
                        variant={
                          selectedStudent.isActive ? 'default' : 'secondary'
                        }
                      >
                        {selectedStudent.isActive ? 'Yes' : 'No'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Enrollments
                      </span>

                      <span className="text-sm font-medium">
                        {Array.isArray(selectedStudent.enrollments)
                          ? selectedStudent.enrollments.length
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enrollment History */}
                {Array.isArray(selectedStudent.enrollments) &&
                  selectedStudent.enrollments.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold">
                        Enrollment History
                      </h4>

                      <div className="grid gap-3">
                        {selectedStudent.enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="min-w-0 rounded-lg border p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <p className="break-words font-medium">
                                {enrollment.packageName || 'Lesson package'}
                              </p>

                              <div className="shrink-0">
                                <Badge variant="secondary">
                                  {formatStatus(enrollment.status)}
                                </Badge>
                              </div>
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground">
                              {Array.isArray(enrollment.courses)
                                ? enrollment.courses
                                    .map((course) => course.name)
                                    .filter(Boolean)
                                    .join(', ') || 'No courses listed'
                                : 'No courses listed'}
                            </p>

                            {['AT_RISK', 'READY_TO_COMPLETE', 'SUSPENDED', 'INACTIVE'].includes(enrollment.status) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {enrollment.status === 'AT_RISK' && (
                                  <Button type="button" size="sm" variant="outline" disabled={notifyingEnrollmentId === enrollment.id} onClick={() => setPendingEnrollmentAction({ type: 'notify', enrollmentId: enrollment.id, packageName: enrollment.packageName })}>
                                    {notifyingEnrollmentId === enrollment.id ? 'Sending...' : 'Notify student'}
                                  </Button>
                                )}
                                {enrollment.status === 'READY_TO_COMPLETE' && (
                                  <Button type="button" size="sm" disabled={updatingEnrollmentId === enrollment.id} onClick={() => setPendingEnrollmentAction({ type: 'status', enrollmentId: enrollment.id, status: 'COMPLETED', packageName: enrollment.packageName })}>
                                    Confirm completion
                                  </Button>
                                )}
                                {enrollment.status !== 'ACTIVE' && (
                                  <Button type="button" size="sm" disabled={updatingEnrollmentId === enrollment.id} onClick={() => setPendingEnrollmentAction({ type: 'status', enrollmentId: enrollment.id, status: 'ACTIVE', packageName: enrollment.packageName })}>
                                    Reactivate
                                  </Button>
                                )}
                                {enrollment.status !== 'SUSPENDED' && (
                                  <Button type="button" size="sm" variant="outline" disabled={updatingEnrollmentId === enrollment.id} onClick={() => setPendingEnrollmentAction({ type: 'status', enrollmentId: enrollment.id, status: 'SUSPENDED', packageName: enrollment.packageName })}>
                                    Suspend
                                  </Button>
                                )}
                                {enrollment.status !== 'INACTIVE' && (
                                  <Button type="button" size="sm" variant="outline" disabled={updatingEnrollmentId === enrollment.id} onClick={() => setPendingEnrollmentAction({ type: 'status', enrollmentId: enrollment.id, status: 'INACTIVE', packageName: enrollment.packageName })}>
                                    Mark inactive
                                  </Button>
                                )}
                              </div>
                            )}

                            {enrollment.enrolledAt && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Enrolled:{' '}
                                {new Date(
                                  enrollment.enrolledAt,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => handleCloseStudentDetails(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingEnrollmentAction)} onOpenChange={(open) => !open && setPendingEnrollmentAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingEnrollmentAction?.type === 'notify' ? 'Notify student?' : `Change enrollment to ${formatStatus(pendingEnrollmentAction?.status)}?`}
            </DialogTitle>
            <DialogDescription>
              {pendingEnrollmentAction?.type === 'notify'
                ? 'This will send the At Risk message through the student notification channels.'
                : <>This will update <span className="font-medium text-foreground">{pendingEnrollmentAction?.packageName || 'this enrollment'}</span>. The student account and enrollment history will be preserved.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingEnrollmentAction(null)}>Cancel</Button>
            <Button type="button" onClick={confirmEnrollmentAction}>
              {pendingEnrollmentAction?.type === 'notify' ? 'Send notification' : 'Confirm change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
