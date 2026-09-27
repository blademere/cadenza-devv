import { AppSidebar } from "../components/app-sidebar";
import { SectionCards } from "../components/section-cards";
import { SiteHeader } from "../components/site-header";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";




const todaySchedule = [
  {
    time: "9:00 AM - 10:00 AM",
    course: "Piano",
    student: "Maria Santos",
    room: "Room 101",
  },
  {
    time: "10:00 AM - 11:00 AM",
    course: "Guitar",
    student: "Juan Dela Cruz",
    room: "Room 102",
  },
  {
    time: "11:00 AM - 12:00 PM",
    course: "Violin",
    student: "Sofia Garcia",
    room: "Room 103",
  },
];

const recentPayments = [
  {
    student: "Maria Santos",
    amount: 1550,
    type: "Enrollment",
  },
  {
    student: "Juan Dela Cruz",
    amount: 3000,
    type: "Enrollment",
  },
  {
    student: "Sofia Garcia",
    amount: 1550,
    type: "Enrollment",
  },
];

export default function DashboardPage() {

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-6">
              {/* Dashboard Header */}
              <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Hello, Front Desk! 
                </h2>

                <p className="text-muted-foreground">
                  Here's what's happening at Cadenza Music Center today.
                </p>
              </div>

              {/* Overview Cards */}
              <SectionCards />

              {/* Dashboard Content */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                {/* Today's Schedule */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold">Today's Schedule</h3>

                    <p className="text-sm text-muted-foreground">
                      Upcoming classes for today
                    </p>
                  </div>

                  <div className="space-y-3">
                    {todaySchedule.map((item, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{item.time}</p>

                          <span className="text-xs text-muted-foreground">
                            {item.room}
                          </span>
                        </div>

                        <p className="mt-1 font-medium">{item.course}</p>

                        <p className="text-sm text-muted-foreground">
                          {item.student}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold">Recent Payments</h3>

                    <p className="text-sm text-muted-foreground">
                      Latest transactions
                    </p>
                  </div>

                  <div className="space-y-3">
                    {recentPayments.map((payment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{payment.student}</p>

                          <p className="text-sm text-muted-foreground">
                            {payment.type}
                          </p>
                        </div>

                        <p className="font-semibold">
                          ₱{payment.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
             
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
