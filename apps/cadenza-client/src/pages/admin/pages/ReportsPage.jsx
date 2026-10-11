import { useEffect, useMemo, useState } from "react";
import { BarChart3Icon, BookOpenCheckIcon, CalendarDaysIcon, CreditCardIcon, GraduationCapIcon, PrinterIcon, UsersIcon } from "lucide-react";
import { AppSidebar } from "../components/app-sidebar";
import ReportsPageLayout from "../layouts/ReportsPageLayout";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/core/api/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const today = new Date();
const dateValue = (date) => date.toISOString().slice(0, 10);
const reportTypes = [
  { id: "enrollment-summary", title: "Enrollment Summary Reports", description: "Enrollment counts, active packages, and course demand.", icon: GraduationCapIcon, columns: ["Metric", "Value"], rows: [["Total enrollments", "-"], ["Active enrollments", "-"], ["Completed enrollments", "-"], ["Most enrolled course", "-"]] },
  { id: "billing-payments", title: "Billing and Payment Reports", description: "Revenue, payment methods, outstanding balances, and status.", icon: CreditCardIcon, columns: ["Metric", "Amount / Count"], rows: [["Total billed", "-"], ["Payments received", "-"], ["Outstanding balance", "-"], ["Pending payments", "-"]] },
  { id: "instructor-assignments", title: "Instructor Assignments Reports", description: "Instructor workload, assigned courses, and student coverage.", icon: UsersIcon, columns: ["Instructor", "Courses", "Students"], rows: [["No assignment data loaded", "-", "-"]] },
  { id: "studio-bookings", title: "Studio Booking Reports", description: "Room usage, booking volume, and booking status by date.", icon: CalendarDaysIcon, columns: ["Metric", "Value"], rows: [["Total bookings", "-"], ["Approved bookings", "-"], ["Cancelled bookings", "-"], ["Most used room", "-"]] },
  { id: "instrument-usage", title: "Instrument Usage Reports", description: "Instrument rentals, utilization, and return activity.", icon: BarChart3Icon, columns: ["Metric", "Value"], rows: [["Total rentals", "-"], ["Active rentals", "-"], ["Returned instruments", "-"], ["Most used instrument", "-"]] },
  { id: "lesson-progress", title: "Student Lesson Progress Reports", description: "Attendance, completed lessons, and student progress trends.", icon: BookOpenCheckIcon, columns: ["Metric", "Value"], rows: [["Lessons scheduled", "-"], ["Lessons completed", "-"], ["Attendance rate", "-"], ["Students needing follow-up", "-"]] },
];

export default function ReportsPage() {
  const [selectedReportId, setSelectedReportId] = useState(reportTypes[0].id);
  const [startDate, setStartDate] = useState(dateValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)));
  const [endDate, setEndDate] = useState(dateValue(today));
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPrintRequested, setIsPrintRequested] = useState(false);
  const generatedAt = useMemo(() => new Date().toLocaleString(), []);
  const selectedReport = useMemo(() => reportTypes.find((report) => report.id === selectedReportId) ?? reportTypes[0], [selectedReportId]);
  const columns = reportData?.columns ?? selectedReport.columns;
  const rows = reportData?.rows ?? selectedReport.rows;

  useEffect(() => {
    if (!startDate || !endDate) return undefined;
    let isMounted = true;
    setIsLoading(true);
    setError("");
    apiClient.get(`/reports?type=${selectedReportId}&from=${startDate}&to=${endDate}`)
      .then((response) => { if (isMounted) setReportData(response?.data ?? null); })
      .catch((requestError) => { if (isMounted) { setReportData(null); setError(requestError.message || "Failed to load report data."); } })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [endDate, selectedReportId, startDate]);

  const setDateRange = (days) => {
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    setStartDate(dateValue(start));
    setEndDate(dateValue(today));
  };

  useEffect(() => {
    const clearPrintState = () => setIsPrintRequested(false);
    window.addEventListener("afterprint", clearPrintState);
    return () => window.removeEventListener("afterprint", clearPrintState);
  }, []);

  const handlePrint = () => {
    setIsPrintRequested(true);
    requestAnimationFrame(() => window.print());
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" className="print:hidden" />
      <SidebarInset>
        <SiteHeader className="print:hidden" />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="reports-ui flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div><h1 className="text-2xl font-semibold tracking-tight">Reports</h1><p className="text-muted-foreground">Generate reports for any date range and print them as PDF.</p></div>
            <Button onClick={handlePrint} disabled={isPrintRequested}><PrinterIcon className="mr-2 size-4" />{isPrintRequested ? "Preparing PDF..." : "Print / Save PDF"}</Button>
          </div>
          <Card className="reports-ui print:hidden">
            <CardHeader><CardTitle>Report period</CardTitle><CardDescription>Choose any custom time range, then select the report to preview.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="grid flex-1 gap-2"><label htmlFor="report-start" className="text-sm font-medium">From</label><Input id="report-start" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              <div className="grid flex-1 gap-2"><label htmlFor="report-end" className="text-sm font-medium">To</label><Input id="report-end" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDateRange(7)}>Last 7 days</Button><Button variant="outline" onClick={() => setDateRange(30)}>Last 30 days</Button><Button variant="outline" onClick={() => setDateRange(90)}>Last 90 days</Button></div>
            </CardContent>
          </Card>
          <section className="reports-ui grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:hidden" aria-label="Report types">
            {reportTypes.map((report) => { const Icon = report.icon; return <button key={report.id} type="button" onClick={() => setSelectedReportId(report.id)} className={`rounded-xl border bg-card p-5 text-left shadow-xs transition-colors hover:bg-muted/50 ${report.id === selectedReport.id ? "border-primary ring-2 ring-primary/20" : ""}`}><Icon className="mb-4 size-6 text-primary" /><h2 className="font-semibold">{report.title}</h2><p className="mt-1 text-sm text-muted-foreground">{report.description}</p></button>; })}
          </section>
          <ReportsPageLayout
            report={selectedReport}
            columns={columns}
            rows={rows}
            startDate={startDate}
            endDate={endDate}
            generatedAt={generatedAt}
            isLoading={isLoading}
            error={error}
          />
        </main>
      </SidebarInset>
      <style>{`.report-template { display: flex; min-height: 620px; flex-direction: column; gap: 24px; border: 1px solid #d1d5db; border-radius: 12px; background: #fff; padding: 32px; color: #111827; } .report-template__header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 20px; } .report-template__eyebrow { margin: 0 0 4px; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; } .report-template__title { margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700; } .report-template__mark { display: grid; height: 36px; width: 36px; place-items: center; border: 2px solid #111827; border-radius: 50%; font-weight: 700; } .report-template__details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; border-bottom: 1px solid #d1d5db; padding-bottom: 20px; } .report-template__details div { display: grid; gap: 5px; } .report-template__details span { color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; } .report-template__details strong { font-size: 14px; } .report-template__body { flex: 1; } .report-template__table { width: 100%; border-collapse: collapse; font-size: 13px; } .report-template__table th { background: #f3f4f6; font-weight: 700; text-align: left; } .report-template__table th, .report-template__table td { border: 1px solid #d1d5db; padding: 11px 12px; vertical-align: top; } .report-template__message { margin: 0; color: #6b7280; font-size: 13px; } .report-template__message--error { color: #b91c1c; } .report-template__footer { display: flex; justify-content: space-between; border-top: 1px solid #d1d5db; padding-top: 14px; color: #6b7280; font-size: 11px; } @media print { @page { size: A4 portrait; margin: 14mm; } html, body, #root { background: white !important; } .reports-ui, [data-slot="sidebar"], header { display: none !important; } .report-template { display: flex !important; visibility: visible !important; width: 100% !important; min-height: 260mm; border: 0 !important; border-radius: 0 !important; padding: 0 !important; background: #fff !important; color: #111827 !important; } .report-template__table { display: table !important; visibility: visible !important; width: 100% !important; } .report-template__table th, .report-template__table td { color: #111827 !important; } .report-template__footer { margin-top: auto; } }`}</style>
      <style>{`@media print { .report-template__header { display: flex !important; visibility: visible !important; } }`}</style>
    </SidebarProvider>
  );
}
