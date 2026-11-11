import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx/xlsx.mjs';
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

const REPORTS = [
  { id: 'payment-sales', title: 'Payment Report', description: 'Payments received, methods, statuses, balances, and references.', icon: WalletIcon },
  { id: 'enrollment-report', title: 'Enrollment Report', description: 'Student courses, packages, instructors, and enrollment statuses.', icon: GraduationCapIcon },
  { id: 'instrument-equipment', title: 'Instrument and Equipment Report', description: 'Instrument and equipment availability, condition, and usage.', icon: GuitarIcon },
  { id: 'rental-monitoring', title: 'Rentals Report', description: 'Rental transactions, returns, overdue items, and rental value.', icon: UsersIcon },
  { id: 'room-utilization', title: 'Bookings Report', description: 'Room reservations, dates, status, duration, and booking value.', icon: CalendarDaysIcon },
];

const REPORT_STATUS_OPTIONS = {
  'payment-sales': ['ALL', 'PAID', 'SUCCESSFUL', 'PENDING', 'PARTIALLY_PAID', 'REFUNDED'],
  'enrollment-report': ['ALL', 'FOR_APPROVAL', 'APPROVED', 'ACTIVE', 'AT_RISK', 'COMPLETED', 'CANCELLED', 'REJECTED'],
  'instrument-equipment': ['ALL', 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'],
  'rental-monitoring': ['ALL', 'REQUESTED', 'APPROVED', 'ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED', 'REJECTED'],
  'room-utilization': ['ALL', 'REQUESTED', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'],
};

const statusLabel = (value) => value === 'ALL' ? 'All statuses' : value.replaceAll('_', ' ').replace(/\\b\\w/g, (letter) => letter.toUpperCase());

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
    <Card size="sm" className="reports-ui print:hidden">
      <CardHeader className="p-3 pb-2">
        <CardTitle>Revenue trend</CardTitle>
        <CardDescription>Successful payment amounts by month within the selected report period.</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
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
  const [selectedId, setSelectedId] = useState('payment-sales');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reportData, setReportData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [overviewError, setOverviewError] = useState('');
  const [printing, setPrinting] = useState(false);

  const selectedReport = REPORTS.find((report) => report.id === selectedId) || REPORTS[0];
  const visibleReports = REPORTS;
  const dateValid = Boolean(startDate && endDate && startDate <= endDate);
  const queryRange = `from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}`;
  const filteredRows = useMemo(() => {
    const rows = Array.isArray(reportData?.rows) ? reportData.rows : [];
    return rows.filter((row) => {
      const text = row.map((value) => String(value ?? '')).join(' ').toLowerCase();
      return statusFilter === 'ALL' || text.includes(statusFilter.toLowerCase());
    });
  }, [reportData, statusFilter]);

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
  const exportExcel = () => {
    const columns = Array.isArray(reportData?.columns) ? reportData.columns : [];
    const rows = Array.isArray(reportData?.rows) ? reportData.rows : [];
    if (!columns.length || !rows.length) return;
    const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);
    worksheet['!cols'] = columns.map((column, index) => ({
      wch: Math.min(40, Math.max(String(column).length + 2, ...rows.map((row) => String(row?.[index] ?? '').length + 2))),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${selectedReport.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-${startDate}-to-${endDate}.xlsx`);
  };
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
        <main className="flex flex-1 flex-col gap-3 p-3 lg:p-4">
          <div className="reports-ui print:hidden">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
              <p className="text-sm text-muted-foreground">Operational overview and detailed reports for Cadenza Music Center.</p>
            </div>
          </div>
          <section className="reports-ui space-y-3 print:hidden">
            <h2 className="text-lg font-semibold">Admin reports dashboard</h2>
            {!dateValid && <p role="alert" className="text-sm text-destructive">Select a valid date range.</p>}
            {overviewError && <p role="alert" className="text-sm text-destructive">{overviewError}</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(({ label, value, icon: Icon }) => (
                <Card size="sm" key={label}><CardContent className="flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" />{label}</div>
                  <p className="text-2xl font-semibold tabular-nums">{overviewLoading || overviewError || !overview ? '—' : value}</p>
                </CardContent></Card>
              ))}
            </div>
            <RevenueChart series={overview?.series} />
          </section>

          <section className="reports-ui space-y-4 print:hidden">
            <h2 className="text-lg font-semibold">Reports</h2>
            <Card size="sm"><CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,220px)_minmax(0,170px)_minmax(0,170px)_minmax(0,220px)_auto_auto] lg:items-end"><div className="space-y-1"><label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="report-type">Report type</label><select id="report-type" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setStatusFilter('ALL'); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{visibleReports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}</select></div><div className="space-y-1"><label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="report-from">From</label><Input id="report-from" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div><div className="space-y-1"><label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="report-to">To</label><Input id="report-to" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></div><div className="space-y-1"><label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="report-status">Status</label><select id="report-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{(REPORT_STATUS_OPTIONS[selectedId] || ['ALL']).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div><Button type="button" variant="outline" size="sm" onClick={() => setStatusFilter('ALL')}>Reset filters</Button><div className="flex flex-wrap gap-2">{[7, 30, 90].map((days) => <Button key={days} size="sm" variant="ghost" onClick={() => setRange(days)}>Last {days} days</Button>)}</div></CardContent></Card>
          </section>

          <div className="reports-ui flex flex-wrap items-end justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-lg font-semibold">Report preview</h2>
              <p className="text-sm text-muted-foreground">Select a report above to preview or print it using the existing PDF layout.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportExcel} disabled={reportLoading || Boolean(error) || !reportData || !dateValid}>
                Export Excel
              </Button>
              <Button onClick={() => { setPrinting(true); requestAnimationFrame(() => window.print()); }} disabled={printing || reportLoading || Boolean(error) || !reportData || !dateValid}>
                <PrinterIcon className="mr-2 size-4" /> Print / Save PDF
              </Button>
            </div>
          </div>
          <ReportsPageLayout
            report={selectedReport}
            columns={Array.isArray(reportData?.columns) ? reportData.columns : ['Metric', 'Value']}
            rows={filteredRows}
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
