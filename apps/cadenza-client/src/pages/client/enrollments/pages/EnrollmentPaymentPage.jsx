import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { createEnrollment } from '../services/enrollmentServices';

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function EnrollmentPaymentPage() {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [completedEnrollment, setCompletedEnrollment] = useState(null);

  const checkout = useMemo(() => {
    try {
      const stored = localStorage.getItem(
        'cadenza-pending-enrollment-checkout',
      );
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const amountDue =
    Number(checkout?.package?.price || 0) *
    (checkout?.paymentPlan === 'DOWN_PAYMENT' ? 0.5 : 1);

  const handlePay = async () => {
    if (!checkout?.lessonPackageId || !checkout?.paymentPlan) {
      setError('No pending enrollment payment was found.');
      return;
    }

    try {
      setPaying(true);
      setError('');

      const paymentMetadata = {
        ...(checkout.metadata || {}),
        paymentMethod: 'QR',
        paymentStatus: 'PENDING_CONFIRMATION',
        paymentAmount: amountDue,
        paymentReference:
          checkout.metadata?.paymentReference || `QR-${Date.now()}`,
      };

      const enrollment = await createEnrollment({
        lessonPackageId: checkout.lessonPackageId,
        sessions: checkout.sessions,
        metadata: paymentMetadata,
      });

      localStorage.removeItem('cadenza-pending-enrollment-checkout');
      setCompletedEnrollment({
        ...enrollment,
        metadata: enrollment.metadata || paymentMetadata,
      });

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'CADENZA_ENROLLMENT_PAYMENT_COMPLETED',
            enrollmentId: enrollment.id,
          },
          window.location.origin,
        );
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to process payment.');
      setPaying(false);
    }
  };

  if (!checkout?.sessions?.length) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-destructive">
          No pending payment was found.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-lg">
        {completedEnrollment ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold">Payment Submitted</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your enrollment transaction was recorded for front desk confirmation.
            </p>
            <div className="mt-6 rounded-xl bg-muted/50 p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Transaction</span>
                <span className="font-medium">
                  {completedEnrollment.metadata?.paymentReference}
                </span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {formatCurrency(completedEnrollment.metadata?.paymentAmount)}
                </span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium">QR</span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-amber-600">
                  Pending confirmation
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/client/enrollments/${completedEnrollment.id}`)}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              View Enrollment Details
            </button>
          </>
        ) : (
          <>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Scan to Pay</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lesson enrollment
        </p>
        <div className="mx-auto mt-7 w-fit rounded-xl bg-white p-5 shadow-sm">
          <QrCode className="h-52 w-52 text-slate-900" />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Amount due:{' '}
          <span className="font-semibold text-foreground">
            {formatCurrency(amountDue)}
          </span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Online payment is not connected yet. Click Pay to submit this
          enrollment for front desk confirmation.
        </p>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handlePay}
          disabled={paying}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {paying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {paying ? 'Paying...' : 'Pay'}
        </button>
          </>
        )}
      </section>
    </main>
  );
}
