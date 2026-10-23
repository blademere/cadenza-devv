import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIcon, BarChart3Icon, BookOpenCheckIcon, CalendarDaysIcon,
  CreditCardIcon, GraduationCapIcon, GuitarIcon, PrinterIcon,
  UsersIcon, WalletIcon, AlertCircleIcon,
} from 'lucide-react';
import { AppSidebar } from '../components/app-sidebar';
import ReportsPageLayout from '../layouts/ReportsPageLayout';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/core/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

const CATEGORIES = [
  { id: 'all', name: 'All reports' },
  { id: 'financial', name: 'Financial Reports' },
  { id: 'students', name: 'Enrollment and Student Reports' },
  { id: 'rentals', name: 'Rental and Inventory Reports' },
  { id: 'instructors', name: 'Instructor Reports' },
  { id: 'operations', name: 'Operational Reports' },
];

const REPORTS = [
  { id: 'revenue-sales', title: 'Revenue and Sales', description: 'Collected revenue by transaction type.', category: 'financial', icon: WalletIcon },
  { id: 'billing-payments', title: 'Billing and Payments', description: 'Bills, collections, pending payments and balances.', category: 'financial', icon: CreditCardIcon },
  { id: 'enrollment-summary', title: 'Enrollment Summary', description: 'Enrollment totals, statuses and course demand.', category: 'students', icon: GraduationCapIcon },
  { id: 'student-attendance', title: 'Student Attendance', description: 'Attendance recording and presence rates.', category: 'students', icon: UsersIcon },
  { id: 'lesson-progress', title: 'Student Lesson Progress', description: 'Completed lessons and students needing follow-up.', category: 'students', icon: BookOpenCheckIcon },
  { id: 'course-performance', title: 'Course Performance', description: 'Enrollments by course.', category: 'students', icon: BarChart3Icon },
  { id: 'instrument-usage', title: 'Instrument Usage', description: 'Instrument rental volume and popular items.', category: 'rentals', icon: GuitarIcon },
  { id: 'rental-monitoring', title: 'Rental Monitoring', description: 'Active rentals, returns and overdue rentals.', category: 'rentals', icon: ActivityIcon },
  { id: 'studio-bookings', title: 'Room Rental Bookings', description: 'Booking volume, approvals and cancellations.', category: 'rentals', icon: CalendarDaysIcon },
  { id: 'instructor-assignments', title: 'Instructor Workload', description: 'Assigned teaching sessions and courses.', category: 'instructors', icon: UsersIcon },
  { id: 'cancellation-summary', title: 'Cancellation Summary', description: 'Cancelled enrollments, rooms and instrument rentals.', category: 'operations', icon: AlertCircleIcon },
];

const dateValue = (date) => {
  const year = date.getFullYear();
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const peso = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

function RevenueChart({ series }) {
  const items = Array.isArray(series) ? series : [];
  const monthly = new Map();
  for (const point of items) {
    const key = String(point.date || '').slice(0, 7);
    if (!key) continue;
    monthly.set(key, (monthly.get(key) || 0) + Number(point.successfulPayments || 0));
  }
  const data = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maximum = Math.max(1, ...data.map(([, amount]) => amount));
  return (
    <Card className="reports-ui print:hidden">
      <CardHeader>
        <CardTitle>Revenue trend</CardTitle>
        <CardDescription>Successful payment amounts by month within the selected report period.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="flex min-h-48 items-end gap-3 overflow-x-auto pb-2" role="img" aria-label="Revenue bar chart">
            {data.map(([month, amount]) => (
              <div key={month} className="flex min-w-16 flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium tabular-nums">{peso(amount)}</span>
                <div className="flex h-36 w-full items-end rounded bg-muted/50">
                  <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(3, amount / maximum * 100)}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{month}</span>
              </div>
            ))}
          </div>
        ) : <p className="py-12 text-center text-sm text-muted-foreground">No successful payments found for this date range.</p>}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => dateValue(new Date(Date.now() - 29 * 86400000)));
  const [endDate, setEndDate] = useState(() => dateValue(new Date()));
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState('revenue-sales');
  const [reportData, setReportData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [overviewError, setOverviewError] = useState('');
  const [printing, setPrinting] = useState(false);

  const selectedReport = REPORTS.find((report) => report.id === selectedId) || REPORTS[0];
  const visibleReports = useMemo(() => REPORTS.filter((report) => category === 'all' || report.category === category), [category]);
  const dateValid = Boolean(startDate && endDate && startDate <= endDate);
  const queryRange = `from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}`;

  useEffect(() => {
    if (!dateValid) return;
    let active = true;
    setReportLoading(true);
    setReportData(null);
    setError('');
    apiClient.get(`/reports?type=${encodeURIComponent(selectedId)}&${queryRange}`)
      .then((response) => { if (active) setReportData(unwrap(response)); })
      .catch((requestError) => { if (active) setError(requestError?.response?.data?.message || requestError.message || 'Unable to load the report.'); })
      .finally(() => { if (active) setReportLoading(false); });
    return () => { active = false; };
  }, [selectedId, startDate, endDate, dateValid]);

  useEffect(() => {
    if (!dateValid) return;
    let active = true;
    setOverviewLoading(true);
    setOverviewError('');
    apiClient.get(`/reports?type=dashboard-activity&${queryRange}`)
      .then((response) => { if (active) setOverview(unwrap(response)); })
      .catch((requestError) => { if (active) { setOverview(null); setOverviewError(requestError?.response?.data?.message || requestError.message || 'Unable to load overview.'); } })
      .finally(() => { if (active) setOverviewLoading(false); });
    return () => { active = false; };
  }, [startDate, endDate, dateValid]);

  useEffect(() => {
    const reset = () => setPrinting(false);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  const setRange = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setStartDate(dateValue(start));
    setEndDate(dateValue(end));
  };
  const generatedAt = new Date().toLocaleString('en-PH');
  const summary = overview?.summary || {};
  const kpis = [
    { label: 'Total revenue collected', value: peso(summary.successfulPaymentAmount), icon: WalletIcon },
    { label: 'Active enrollments', value: summary.activeEnrollments ?? '—', icon: GraduationCapIcon },
    { label: 'Outstanding balance', value: peso(summary.outstandingBalance), icon: CreditCardIcon },
    { label: 'Active / pending rentals', value: summary.activeRentals ?? '—', icon: GuitarIcon },
  ];

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" className="print:hidden" />
      <SidebarInset>
        <SiteHeader className="print:hidden" />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="reports-ui flex flex-wrap items-start justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
              <p className="text-sm text-muted-foreground">Operational overview and detailed reports for Cadenza Music Center.</p>
            </div>
            <Button onClick={() => { setPrinting(true); requestAnimationFrame(() => window.print()); }} disabled={printing || reportLoading || Boolean(error) || !reportData || !dateValid}>
              <PrinterIcon className="mr-2 size-4" /> Print / Save PDF
            </Button>
          </div>
          <Card className="reports-ui print:hidden">
            <CardHeader><CardTitle>Report period</CardTitle><CardDescription>All dashboard metrics and report tables follow the selected date range.</CardDescription></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-36 flex-1 space-y-2"><label className="text-sm font-medium" htmlFor="report-from">From</label><Input id="report-from" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              <div className="min-w-36 flex-1 space-y-2"><label className="text-sm font-medium" htmlFor="report-to">To</label><Input id="report-to" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></div>
              <div className="flex flex-wrap gap-2">{[7, 30, 90].map((days) => <Button key={days} variant="outline" onClick={() => setRange(days)}>Last {days} days</Button>)}</div>
            </CardContent>
          </Card>

          <section className="reports-ui space-y-3 print:hidden">
            <h2 className="text-lg font-semibold">Admin reports dashboard</h2>
            {!dateValid && <p role="alert" className="text-sm text-destructive">Select a valid date range.</p>}
            {overviewError && <p role="alert" className="text-sm text-destructive">{overviewError}</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(({ label, value, icon: Icon }) => (
                <Card key={label}><CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" />{label}</div>
                  <p className="text-2xl font-semibold tabular-nums">{overviewLoading || overviewError || !overview ? '—' : value}</p>
                </CardContent></Card>
              ))}
            </div>
            <RevenueChart series={overview?.series} />
          </section>

          <section className="reports-ui space-y-4 print:hidden">
            <h2 className="text-lg font-semibold">Report categories</h2>
            <div className="flex flex-wrap gap-2" aria-label="Report categories">
              {CATEGORIES.map((item) => (
                <Button key={item.id} type="button" variant={category === item.id ? 'default' : 'outline'} onClick={() => {
                  setCategory(item.id);
                  if (item.id !== 'all') {
                    const first = REPORTS.find((report) => report.category === item.id);
                    if (first) setSelectedId(first.id);
                  }
                }}>{item.name}</Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleReports.map((report) => {
                const Icon = report.icon;
                return (
                  <button key={report.id} type="button" onClick={() => setSelectedId(report.id)} aria-pressed={selectedId === report.id}
                    className={`rounded-xl border bg-card p-5 text-left transition-colors hover:bg-muted/50 ${selectedId === report.id ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                    <Icon className="mb-3 size-5 text-primary" />
                    <h3 className="font-semibold">{report.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="reports-ui print:hidden">
            <h2 className="text-lg font-semibold">Report preview</h2>
            <p className="text-sm text-muted-foreground">Select a report above to preview or print it using the existing PDF layout.</p>
          </div>
          <ReportsPageLayout
            report={selectedReport}
            columns={Array.isArray(reportData?.columns) ? reportData.columns : ['Metric', 'Value']}
            rows={Array.isArray(reportData?.rows) ? reportData.rows : []}
            startDate={startDate}
            endDate={endDate}
            generatedAt={generatedAt}
            isLoading={reportLoading}
            error={error || (!dateValid ? 'Invalid report date range.' : '')}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
