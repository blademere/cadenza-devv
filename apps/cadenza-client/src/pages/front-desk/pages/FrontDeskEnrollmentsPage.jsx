'use client';

import { useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import {
  SearchIcon,
  Loader2Icon,
  FileIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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

import { Badge } from '@/components/ui/Badge';
import { enrollmentService } from '@/services/front-desk/enrollmentService';

const formatEnrollmentReference = (id) =>
  id ? `ENR-${id.slice(0, 8).toUpperCase()}` : '—';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await enrollmentService.getEnrollments({
          ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
          page,
          limit: 10,
        });
        setEnrollments(result.items || []);
        setPagination(result.pagination || null);
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to load enrollments.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadEnrollments();
  }, [page, statusFilter]);

  /* ----------------------------------------
     Search
  ---------------------------------------- */

  const filteredEnrollments = enrollments.filter((enrollment) =>
    `${enrollment.id} ${enrollment.student || ''} ${
      enrollment.packageName || ''
    } ${enrollment.lessons?.map((lesson) => lesson.name).join(' ') || ''} ${
      enrollment.sessions?.map((session) => session.instructorName).join(' ') ||
      ''
    }`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  /* ----------------------------------------
     Open Enrollment Details
  ---------------------------------------- */

  const handleViewDetails = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setActionError('');
    setActionMessage('');
    setShowDetailsDialog(true);
  };

  const updateEnrollmentInList = (updatedEnrollment) => {
    setEnrollments((current) =>
      current.map((item) =>
        item.id === updatedEnrollment.id ? updatedEnrollment : item,
      ),
    );
    setSelectedEnrollment(updatedEnrollment);
  };

  const handleApprove = async () => {
    if (!selectedEnrollment || actionLoading) return;

    try {
      setActionLoading(true);
      setActionError('');
      const updatedEnrollment = await enrollmentService.approveEnrollment(
        selectedEnrollment.id,
      );
      updateEnrollmentInList(updatedEnrollment);
      setActionMessage(
        updatedEnrollment.metadata?.paymentContinuationRequired
          ? 'Enrollment approved. Payment continuation is still required for the remaining balance.'
          : 'Enrollment approved. Full payment has been recorded for this enrollment.',
      );
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to approve this enrollment.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedEnrollment || actionLoading) return;
    if (cancellationReason.trim().length < 3) {
      setActionError('Please enter a cancellation reason (at least 3 characters).');
      return;
    }

    try {
      setActionLoading(true);
      setActionError('');
      const updatedEnrollment = await enrollmentService.cancelEnrollment(
        selectedEnrollment.id,
        cancellationReason.trim(),
      );
      setCancellationReason('');
      updateEnrollmentInList(updatedEnrollment);
      setShowCancelDialog(false);
      setActionMessage('Enrollment cancelled.');
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to cancel this enrollment.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Enrollments</h1>

              <p className="text-muted-foreground">
                Manage student course enrollments.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCwIcon className="mr-2 size-4" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Records</CardTitle>

              <CardDescription>
                Enrollment requests waiting for front-desk approval.
              </CardDescription>

              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                <Input
                  className="pl-9"
                  placeholder="Search enrollments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="FOR_APPROVAL">For approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="ALL">All statuses</option>
                </select>
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enrollment</TableHead>

                      <TableHead>Student</TableHead>

                      <TableHead>Package</TableHead>

                      <TableHead>Instructor</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2Icon className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredEnrollments.length > 0 ? (
                      filteredEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {formatEnrollmentReference(enrollment.id)}
                          </TableCell>

                          <TableCell>{enrollment.student}</TableCell>

                          <TableCell>{enrollment.packageName || '—'}</TableCell>

                          <TableCell>
                            {enrollment.sessions?.[0]?.instructorName || '—'}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                enrollment.status === 'ACTIVE'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {enrollment.status || '—'}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View student details"
                              onClick={() => handleViewDetails(enrollment)}
                            >
                              <FileIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No enrollments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                <span>{pagination?.total || 0} enrollment records</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination?.hasPreviousPage || loading}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {pagination?.page || page} of {pagination?.pages || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
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

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[650px] sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enrollment Details</DialogTitle>

              <DialogDescription>
                Review the student, package, schedule, and payment information.
              </DialogDescription>
            </DialogHeader>

            {selectedEnrollment && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Enrollment Information
                    </h3>

                    <Badge variant="secondary">
                      {selectedEnrollment.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Enrollment ID
                      </p>

                      <p className="font-medium">{formatEnrollmentReference(selectedEnrollment.id)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Student</p>

                      <p className="font-medium">
                        {selectedEnrollment.student}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Course</p>

                      <p className="font-medium">
                        {' '}
                        {selectedEnrollment.lessons
                          ?.filter((lesson) => String(lesson.id) === String(selectedEnrollment.courseId))
                          .map((lesson) => lesson.name)
                          .join(', ') || selectedEnrollment.lessons?.find((lesson) => String(lesson.id) === String(selectedEnrollment.courseId))?.name || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Instructor
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.sessions?.[0]?.instructorName ||
                          '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Instrument
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.packageName || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Package</p>

                      <p className="font-medium">
                        {selectedEnrollment.numberOfSessions} sessions
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Start Date
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.sessions?.[0]?.scheduledStart
                          ? new Date(
                              selectedEnrollment.sessions[0].scheduledStart,
                            ).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Enrollment End Date</p>
                      <p className="font-medium">
                        {selectedEnrollment.sessions?.length
                          ? new Date(Math.max(...selectedEnrollment.sessions.map((session) => new Date(session.scheduledEnd).getTime()))).toLocaleString('en-PH')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled Instructors</p>
                      <p className="font-medium">
                        {[...new Set(selectedEnrollment.sessions?.map((session) => session.instructorName).filter(Boolean) || [])].join(', ') || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Enrollment Rate
                      </p>

                      <p className="font-medium">
                        {selectedEnrollment.price != null
                          ? `₱${Number(selectedEnrollment.price).toLocaleString()}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Payment Details</h3>

                    <Badge variant="secondary">Backend record</Badge>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Amount */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Amount submitted
                        </p>

                        <p className="text-lg font-semibold">
                          {selectedEnrollment.metadata?.paymentAmount != null
                            ? `₱${Number(
                                selectedEnrollment.metadata.paymentAmount,
                              ).toLocaleString()}`
                            : '—'}
                        </p>
                      </div>

                      {/* Payment Method */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment plan
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.metadata?.paymentPlan ===
                          'DOWN_PAYMENT'
                            ? 'Partial downpayment'
                            : 'Full payment'}
                        </p>
                      </div>

                      {/* Payment Date */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment status
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.metadata?.paymentStatus ||
                            'Pending confirmation'}
                        </p>
                      </div>

                      {/* Reference */}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment reference
                        </p>

                        <p className="font-medium">
                          {selectedEnrollment.metadata?.paymentReference || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedEnrollment.status === 'FOR_APPROVAL' && (
                    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                      <p className="text-sm font-medium">
                        Payment verification required
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Review the submitted reference and payment plan before
                        approving this enrollment.
                      </p>
                    </div>
                  )}

                  {selectedEnrollment.metadata?.paymentContinuationRequired && (
                    <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                      <p className="text-sm font-medium">
                        Payment continuation required
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Remaining balance:{' '}
                        {selectedEnrollment.metadata.paymentBalanceDue != null
                          ? `₱${Number(
                              selectedEnrollment.metadata.paymentBalanceDue,
                            ).toLocaleString()}`
                          : 'To be calculated'}
                        . Billing continuation will be handled in a later
                        update.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
            {actionMessage && (
              <p className="text-sm text-emerald-600">{actionMessage}</p>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
              {selectedEnrollment?.status === 'FOR_APPROVAL' && (
                <>
                  <Button
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={() => { setCancellationReason(''); setActionError(''); setShowCancelDialog(true); }}
                  >
                    <XCircleIcon />
                    Cancel enrollment
                  </Button>
                  <Button disabled={actionLoading} onClick={handleApprove}>
                    {actionLoading ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <CheckCircle2Icon />
                    )}
                    Approve enrollment
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCancelDialog} onOpenChange={(open) => { if (!actionLoading) setShowCancelDialog(open); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel this enrollment?</DialogTitle>
              <DialogDescription>
                This will mark the enrollment as cancelled and remove it from
                the approval queue.
              </DialogDescription>
            </DialogHeader>
            <label htmlFor="enrollment-cancellation-reason" className="text-sm font-medium">Reason for cancellation</label>
            <textarea
              id="enrollment-cancellation-reason"
              value={cancellationReason}
              onChange={(event) => { setCancellationReason(event.target.value); setActionError(''); }}
              maxLength={500}
              rows={3}
              placeholder="Explain why this enrollment request is being cancelled"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setShowCancelDialog(false)}
              >
                Keep enrollment
              </Button>
              <Button
                variant="destructive"
                disabled={actionLoading || cancellationReason.trim().length < 3}
                onClick={handleCancel}
              >
                {actionLoading && <Loader2Icon className="animate-spin" />}
                {actionLoading ? 'Cancelling...' : 'Confirm cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
