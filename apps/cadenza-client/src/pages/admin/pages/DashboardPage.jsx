import { useEffect, useMemo, useState } from "react";
import {
  Drum,
  GraduationCapIcon,
  Guitar,
  Music2,
  PhilippinePesoIcon,
  Piano,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { ChartAreaInteractive } from "../components/chart-area-interactive";
import { SectionCards } from "../components/section-cards";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { apiClient } from "@/core/api/apiClient";
import { getInstructors } from "@/services/admin/instructorService";
import { getStudents } from "@/services/admin/studentService";
import { staffService } from "@/services/admin/staffService";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const unwrapList = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : [];
};

const getDateRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(from), to: format(to) };
};

const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const personName = (student) => student?.name || "Unnamed Student";
const courseIcon = (name) => {
  const value = name.toLowerCase();
  if (value.includes("piano")) return <Piano className="h-5 w-5 text-primary" />;
  if (value.includes("drum")) return <Drum className="h-5 w-5 text-primary" />;
  if (value.includes("violin")) return <Music2 className="h-5 w-5 text-primary" />;
  return <Guitar className="h-5 w-5 text-primary" />;
};
const sameDay = (first, second) => {
  const left = new Date(first);
  const right = new Date(second);
  return left.toDateString() === right.toDateString();
};

const monthKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthTrend = (items, currentMonth, previousMonth) => {
  const current = items.filter((item) => monthKey(item.createdAt) === currentMonth).length;
  const previous = items.filter((item) => monthKey(item.createdAt) === previousMonth).length;

  return current >= previous ? 'up' : 'down';
};

export default function DashboardPage() {
  const [data, setData] = useState({ students: [], instructors: [], staff: [], enrollments: [], activity: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const range = getDateRange();
      const results = await Promise.allSettled([
        getStudents(),
        getInstructors(),
        staffService.getStaff(),
        apiClient.get("/enrollments"),
        apiClient.get("/reports", { params: { type: "dashboard-activity", ...range } }),
      ]);
      if (!mounted) return;
      const [students, instructors, staff, enrollments, activity] = results;
      const staffValue = staff.status === "fulfilled" ? unwrap(staff.value) : [];
      const activityValue = activity.status === "fulfilled" ? unwrap(activity.value) : null;
      setData({
        students: students.status === "fulfilled" ? students.value : [],
        instructors: instructors.status === "fulfilled" ? instructors.value : [],
        staff: Array.isArray(staffValue?.data) ? staffValue.data : staffValue,
        enrollments: enrollments.status === "fulfilled" ? unwrapList(enrollments.value) : [],
        activity: activityValue,
      });
      if (results.every((result) => result.status === "rejected")) setError("Unable to load dashboard data.");
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const courseEnrollments = useMemo(() => {
    const counts = new Map();
    data.students.forEach((student) => (student.courses || []).forEach((course) => {
      if (course?.name) counts.set(course.name, (counts.get(course.name) || 0) + 1);
    }));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([course, students]) => ({ course, students, icon: courseIcon(course) }));
  }, [data.students]);
  const todaySchedule = useMemo(() => data.enrollments.flatMap((enrollment) => (enrollment.sessions || []).filter((session) => sameDay(session.scheduledStart, new Date())).map((session) => ({
    time: `${new Date(session.scheduledStart).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} - ${new Date(session.scheduledEnd).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`,
    course: enrollment.lessons?.map((lesson) => lesson.name).join(", ") || enrollment.packageName || "Lesson",
    student: enrollment.student || "Student",
    room: session.roomId || "Room not assigned",
  }))).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 6), [data.enrollments]);
  const recentStudents = useMemo(() => [...data.students].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5), [data.students]);
  const activeStudents = data.students.filter((student) => student.status === "ACTIVE").length;
  const activeInstructors = data.instructors.filter((instructor) => instructor.status === "ACTIVE").length;
  const activeStaff = data.staff.filter((member) => member.status === "ACTIVE" && member.staffType === "FRONT_DESK").length;
  const now = new Date();
  const currentMonth = monthKey(now);
  const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const currentRevenue = (data.activity?.series || [])
    .filter((item) => monthKey(item.date) === currentMonth)
    .reduce((total, item) => total + Number(item.successfulPayments || 0), 0);
  const previousRevenue = (data.activity?.series || [])
    .filter((item) => monthKey(item.date) === previousMonth)
    .reduce((total, item) => total + Number(item.successfulPayments || 0), 0);
  const cards = [
    { title: "Active Students", value: activeStudents, trend: getMonthTrend(data.students, currentMonth, previousMonth), description: "From current records", footer: "Student enrollment", icon: GraduationCapIcon },
    { title: "Instructors", value: activeInstructors, trend: getMonthTrend(data.instructors, currentMonth, previousMonth), description: "From current records", footer: "Teaching team", icon: UsersIcon },
    { title: "Front Desk Staff", value: activeStaff, trend: getMonthTrend(data.staff, currentMonth, previousMonth), description: "Currently active staff", footer: "Staff accounts", icon: UserRoundIcon },
    { title: "Monthly Revenue", value: formatMoney(currentRevenue), trend: currentRevenue >= previousRevenue ? "up" : "down", description: "Successful payments", footer: "Payment activity", icon: PhilippinePesoIcon },
  ];

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col"><div className="@container/main flex flex-1 flex-col gap-2"><div className="flex flex-col gap-6 py-6">
          <div className="px-4 lg:px-6"><h2 className="text-2xl font-semibold tracking-tight">Hello, Admin</h2><p className="text-muted-foreground">Here's what's happening at Cadenza Music Center today.</p></div>
          {error && <p className="mx-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive lg:mx-6">{error}</p>}
          <SectionCards cards={cards} loading={loading} />
          <div className="px-4 lg:px-6"><ChartAreaInteractive data={data.activity?.series || []} loading={loading} /></div>
          <div className="px-4 lg:px-6"><div className="rounded-xl border bg-card p-6"><div className="mb-5"><h3 className="font-semibold">Students Enrolled by Course</h3><p className="text-sm text-muted-foreground">Current number of students enrolled in each course.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courseEnrollments.map((course) => <div key={course.course} className="flex items-center justify-between rounded-lg border p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2">{course.icon}</div><div><p className="font-medium">{course.course}</p><p className="text-sm text-muted-foreground">Enrolled students</p></div></div><div className="flex items-center gap-1 font-semibold"><UsersIcon className="h-4 w-4 text-muted-foreground" />{course.students}</div></div>)}</div><div className="mt-5 flex items-center justify-between rounded-lg bg-muted p-4"><span className="text-sm font-medium">Total Course Enrollments</span><span className="text-lg font-bold">{courseEnrollments.reduce((total, course) => total + course.students, 0)}</span></div></div></div>
          <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6"><div className="rounded-xl border bg-card p-6"><div className="mb-4"><h3 className="font-semibold">Today's Schedule</h3><p className="text-sm text-muted-foreground">Upcoming classes for today</p></div><div className="space-y-3">{todaySchedule.length ? todaySchedule.map((item, index) => <div key={`${item.time}-${index}`} className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">{item.time}</p><span className="text-xs text-muted-foreground">{item.room}</span></div><p className="mt-1 font-medium">{item.course}</p><p className="text-sm text-muted-foreground">{item.student}</p></div>) : <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>}</div></div>
            <div className="rounded-xl border bg-card p-6"><div className="mb-4"><h3 className="font-semibold">Recent Payments</h3><p className="text-sm text-muted-foreground">Successful payment transactions</p></div><div className="space-y-3">{(data.activity?.recentPayments || []).map((payment) => <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{payment.type || "Payment"}</p><p className="text-sm text-muted-foreground">Transaction {payment.id.slice(0, 8)}</p></div><p className="font-semibold">{formatMoney(payment.amount)}</p></div>)}{!data.activity?.recentPayments?.length && <p className="text-sm text-muted-foreground">No successful payments found.</p>}</div></div></div>
          <div className="px-4 lg:px-6"><div className="rounded-xl border bg-card p-6"><div className="mb-4"><h3 className="font-semibold">Recent Students</h3><p className="text-sm text-muted-foreground">Recently registered students</p></div><div className="space-y-2">{recentStudents.map((student) => <div key={student.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{personName(student)}</p><p className="text-sm text-muted-foreground">{(student.courses || []).map((course) => course.name).filter(Boolean).join(", ") || "No course assigned"}</p></div><span className="text-sm text-muted-foreground">Student</span></div>)}</div></div></div>
        </div></div></div>
      </SidebarInset>
    </SidebarProvider>
  );
}
