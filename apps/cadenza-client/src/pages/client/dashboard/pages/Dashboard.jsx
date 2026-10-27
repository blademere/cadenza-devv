import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  DoorOpen,
  Guitar,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import useAuth from '@/core/auth/useAuth';
import EnrollmentStatus from '../../enrollments/components/EnrollmentStatus';
import { getMyEnrollment } from '../../enrollments/services/enrollmentServices';
import { getMyTransactions } from '../../billing/services/billing.service';

const actions = [
  {
    label: 'Enroll in a course',
    description: 'Choose a package and schedule your lessons.',
    href: '/client/enrollments',
    icon: BookOpen,
  },
  {
    label: 'Book a room',
    description: 'Reserve a room for practice or rehearsal.',
    href: '/client/room-bookings/new',
    icon: DoorOpen,
  },
  {
    label: 'Rent an instrument',
    description: 'Browse instruments available for rental.',
    href: '/client/instrument-rentals',
    icon: Guitar,
  },
];

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([getMyEnrollment(), getMyTransactions()])
      .then(([enrollmentData, transactionData]) => {
        if (!active) {
          return;
        }

        setEnrollments(
          Array.isArray(enrollmentData)
            ? enrollmentData
            : enrollmentData
              ? [enrollmentData]
              : [],
        );
        setTransactions(Array.isArray(transactionData) ? transactionData : []);
      })
      .catch(() => {
        if (active) {
          setEnrollments([]);
          setTransactions([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const refreshTimer = window.setInterval(() => {
      Promise.all([getMyEnrollment(), getMyTransactions()])
        .then(([enrollmentData, transactionData]) => {
          if (!active) return;
          setEnrollments(Array.isArray(enrollmentData) ? enrollmentData : enrollmentData ? [enrollmentData] : []);
          setTransactions(Array.isArray(transactionData) ? transactionData : []);
        })
        .catch(() => {});
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const firstName = user?.person?.firstName || user?.name?.split(' ')[0] || 'there';
  const activeEnrollments = enrollments.filter((enrollment) =>
    ['FOR_APPROVAL', 'APPROVED', 'ACTIVE'].includes(enrollment.status),
  );
  const pendingPayments = transactions.filter(
    (transaction) => transaction.paymentStatus === 'PENDING',
  );

  return (
    <div className="space-y-8 px-4 py-6 lg:px-8">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="text-sm font-medium text-primary">Cadenza Music Center</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Manage your lessons, room bookings, instrument rentals, and payments
          in one place.
        </p>
        <Link
          to="/client/enrollments"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View enrollments
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Active enrollments" value={activeEnrollments.length} />
        <SummaryCard label="Pending payments" value={pendingPayments.length} />
        <SummaryCard label="Transactions" value={transactions.length} />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your next activity at Cadenza.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {actions.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={label}
              to={href}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DashboardList
          title="My enrollments"
          href="/client/enrollments"
          loading={loading}
          empty="No active enrollments yet."
        >
          {activeEnrollments.slice(0, 3).map((enrollment) => (
            <div
              key={enrollment.id}
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {enrollment.packageName || 'Course enrollment'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {enrollment.lessons?.map((lesson) => lesson.name).join(', ') ||
                    'Course details available in enrollments'}
                </p>
              </div>
              <EnrollmentStatus status={enrollment.status} />
            </div>
          ))}
        </DashboardList>

        <DashboardList
          title="Recent payments"
          href="/client/billing"
          loading={loading}
          empty="No transactions yet."
        >
          {transactions.slice(0, 3).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {transaction.description}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {transaction.referenceNumber}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          ))}
        </DashboardList>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DashboardList({ title, href, loading, empty, children }) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{title}</h2>
        <Link to={href} className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="flex min-h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : hasChildren ? (
        <div className="mt-3">{children}</div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
