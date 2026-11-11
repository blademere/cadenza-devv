import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Music,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

import { useNavigate, useParams } from "react-router-dom";

import EnrollmentStatus from "../components/EnrollmentStatus";

import { cancelEnrollment, getEnrollmentById } from "../services/enrollmentServices";

export default function EnrollmentDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [enrollment, setEnrollment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadEnrollment() {
      try {
        const data = await getEnrollmentById(id);

        setEnrollment(data);
      } catch (error) {
        console.error(error);

        setError("Unable to find this enrollment.");
      } finally {
        setLoading(false);
      }
    }

    loadEnrollment();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading enrollment...
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/client/enrollments")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Enrollments
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  const firstSession = enrollment.sessions?.[0];
  const paymentMetadata = enrollment.metadata || {};
  const startDate = firstSession?.scheduledStart
    ? new Date(firstSession.scheduledStart).toLocaleString('en-PH', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : "Not scheduled";
  const submittedAt = enrollment.createdAt
    ? new Date(enrollment.createdAt).toLocaleString()
    : "Not available";
  const payment = enrollment.payment || {};
  const enrollee = enrollment.student || enrollment.metadata?.studentDetails || enrollment.customer?.person || enrollment.person || {};
  const enrolleeName = [enrollee.firstName, enrollee.middleName, enrollee.lastName].filter(Boolean).join(" ") || "Account holder";
  const totalAmount = Number(payment.totalAmount ?? enrollment.price ?? 0);
  const paidAmount = Number(payment.paidAmount ?? paymentMetadata.paymentAmount ?? 0);
  const remainingBalance = Number(payment.remainingBalance ?? Math.max(totalAmount - paidAmount, 0));
  const paymentStatus = payment.paymentStatus || paymentMetadata.paymentStatus || (remainingBalance > 0 ? "PARTIALLY_PAID" : "PAID");
  const nextPaymentDue = payment.nextPaymentDue || enrollment.paymentExpiresAt || paymentMetadata.paymentDueDate;
  const transactionAmount = paymentMetadata.initialPaymentAmount ?? paymentMetadata.paymentAmount ?? 0;
  const canCancel = !["APPROVED", "CANCELLED", "COMPLETED", "REJECTED"].includes(enrollment.status);

  const handleCancel = async () => {
    if (cancelling) return;
    try {
      setCancelling(true);
      const updated = await cancelEnrollment(enrollment.id);
      setEnrollment(updated || { ...enrollment, status: "CANCELLED" });
      setCancelDialogOpen(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Unable to cancel this enrollment.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <button
        type="button"
        onClick={() => navigate("/client/enrollments")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Enrollments
      </button>

      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Enrollment #{enrollment.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              {enrollment.packageName}
            </h1>
          </div>

          <EnrollmentStatus status={enrollment.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 md:col-span-2">
          <p className="text-xs text-muted-foreground">Enrolled student</p>
          <p className="mt-1 text-lg font-semibold">{enrolleeName}</p>
          {enrollee.email && <p className="mt-1 text-sm text-muted-foreground">{enrollee.email}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Package</p>

              <p className="font-medium">{enrollment.packageName}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Instructor</p>

              <p className="font-medium">
                {firstSession?.instructorName || "Assigned instructor"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Preferred Start Date & Time
              </p>

              <p className="font-medium">{startDate}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>

            <p className="font-medium">{submittedAt}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Payment Summary</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Total amount</p><p className="mt-1 font-medium">₱{totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div><p className="text-xs text-muted-foreground">Paid</p><p className="mt-1 font-medium">₱{paidAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div><p className="text-xs text-muted-foreground">Remaining balance</p><p className={`mt-1 font-semibold ${remainingBalance > 0 ? "text-amber-600" : "text-green-600"}`}>₱{remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div><p className="text-xs text-muted-foreground">Next payment due</p><p className="mt-1 font-medium">{nextPaymentDue ? new Date(nextPaymentDue).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" }) : "Not set"}</p></div>
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Latest payment transaction</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Transaction reference</p>
            <p className="mt-1 font-medium">
              {paymentMetadata.paymentReference || "Not available"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="mt-1 font-medium">
              ₱{Number(transactionAmount).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment method</p>
            <p className="mt-1 font-medium">
              {paymentMetadata.paymentMethod || "QR"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment status</p>
            <p className={`mt-1 font-medium ${
              ["PAID", "PARTIALLY_PAID"].includes(paymentStatus)
                ? "text-green-600"
                : "text-amber-600"
            }`}>
              {paymentStatus === "PENDING_CONFIRMATION"
                ? "Pending confirmation"
                : paymentStatus === "PARTIALLY_PAID"
                  ? "Partially paid"
                  : paymentStatus === "PAID"
                    ? "Paid"
                    : paymentStatus || "Pending payment"}
            </p>
          </div>
        </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Application Status</h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-5">
          {["PENDING", "PENDING_PAYMENT", "FOR_APPROVAL"].includes(
            enrollment.status,
          ) && (
            <>
              <h3 className="font-medium">Application Under Review</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your enrollment application has been submitted and is waiting
                for staff approval.
              </p>
            </>
          )}

          {enrollment.status === "APPROVED" && (
            <>
              <h3 className="font-medium">Enrollment Approved</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your enrollment has been approved. You can now proceed with your
                program.
              </p>
            </>
          )}

          {enrollment.status === "CANCELLED" && (
            <div>
              <h3 className="font-medium">Enrollment Cancelled</h3>
              <p className="mt-1 text-sm text-muted-foreground">Your enrollment request was cancelled by the front desk.</p>
              {paymentMetadata.cancellationReason && (
                <p className="mt-3 text-sm"><span className="font-medium">Reason:</span> {paymentMetadata.cancellationReason}</p>
              )}
            </div>
          )}

          {enrollment.status === "REJECTED" && (
            <>
              <h3 className="font-medium">Enrollment Rejected</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your enrollment application was not approved.
              </p>
            </>
          )}
        </div>
        {canCancel && (
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="destructive" onClick={() => setCancelDialogOpen(true)}>
              Cancel enrollment
            </Button>
          </div>
        )}
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={(open) => !cancelling && setCancelDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel enrollment?</DialogTitle>
            <DialogDescription>
              This will cancel {enrollment.packageName || "this enrollment"}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={cancelling} onClick={() => setCancelDialogOpen(false)}>Keep enrollment</Button>
            <Button type="button" variant="destructive" disabled={cancelling} onClick={handleCancel}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cancelling ? "Cancelling..." : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
