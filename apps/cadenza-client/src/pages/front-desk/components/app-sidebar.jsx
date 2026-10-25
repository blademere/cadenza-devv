import { useEffect, useState } from "react";
import { NavMain } from "@/pages/admin/components/nav-main";
import { NavUser } from "@/pages/front-desk/components/nav-user";
import { getInstrumentRentals } from "@/services/front-desk/instrument-rentalsService";
import { getRoomBookings } from "@/services/front-desk/room-bookingsService";
import { apiClient } from "@/core/api/apiClient";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  LayoutDashboardIcon,
  GraduationCapIcon,
  UsersIcon,
  MusicIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  GuitarIcon,
  DoorOpenIcon,
} from "lucide-react";

const data = {
  user: {
    name: "Front Desk",
    email: "frontdesk@cadenzamusic.com",
    avatar: "/avatars/front-desk.jpg",
  },

  navMain: [
    {
      title: "Dashboard",
      url: "/front-desk",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Instructors",
      url: "/front-desk/instructors",
      icon: <UsersIcon />,
    },
    {
      title: "Enrollments",
      url: "/front-desk/enrollments",
      icon: <ClipboardListIcon />,
    },
    {
      title: "Students",
      url: "/front-desk/students",
      icon: <GraduationCapIcon />,
    },
   
    {
      title: "Class Schedule",
      url: "/front-desk/schedule",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Rentals",
      url: "/front-desk/rentals",
      icon: <GuitarIcon />,
    },
    {
      title: "Room Bookings",
      url: "/front-desk/room-bookings",
      icon: <DoorOpenIcon />,
    },
    {
      title: "Billing & Payments",
      url: "/front-desk/billing",
      icon: <CreditCardIcon />,
    }


  ],

};

export function AppSidebar({ ...props }) {
  const [pendingCounts, setPendingCounts] = useState({ enrollments: 0, rentals: 0, bookings: 0, billing: 0, reschedules: 0 });

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getInstrumentRentals(), getRoomBookings(), apiClient.get('/enrollments'), apiClient.get('/enrollments', { params: { status: 'FOR_APPROVAL', page: 1, limit: 1 } }), apiClient.get('/enrollments/reschedule-requests')]).then(([rentalsResult, bookingsResult, enrollmentsResult, approvalResult, rescheduleResult]) => {
      if (!mounted) return;
      const rentals = rentalsResult.status === 'fulfilled' && Array.isArray(rentalsResult.value) ? rentalsResult.value : [];
      const bookings = bookingsResult.status === 'fulfilled' && Array.isArray(bookingsResult.value) ? bookingsResult.value : [];
      const enrollments = enrollmentsResult.status === 'fulfilled' && Array.isArray(enrollmentsResult.value?.data?.data) ? enrollmentsResult.value.data.data : [];
      const pendingRentalStatuses = ['FOR_APPROVAL', 'PENDING', 'PENDING_PAYMENT', 'PENDING_CONFIRMATION'];
      const pendingBilling = [
        ...enrollments.filter((item) => item.status === 'APPROVED').map((item) => ({ total: item.price, paid: item.metadata?.paymentAmount ?? (item.metadata?.paymentPlan === 'FULL_PAYMENT' ? item.price : 0) })),
        ...bookings.filter((item) => ['APPROVED', 'CHECKED_IN', 'COMPLETED'].includes(item.status)).map((item) => ({ total: item.totalAmount, paid: item.metadata?.paymentAmount ?? item.metadata?.initialPaymentAmount })),
        ...rentals.filter((item) => ['APPROVED', 'COMPLETED'].includes(item.status)).map((item) => ({ total: item.totalAmount, paid: item.metadata?.paymentAmount ?? item.metadata?.initialPaymentAmount })),
      ].filter((item) => {
        const total = Number(item.total || 0);
        const paid = Number(item.paid || 0);
        return total > 0 && paid > 0 && paid < total;
      }).length;
      const approvalTotal = approvalResult.status === 'fulfilled'
        ? Number(approvalResult.value?.data?.pagination?.total ?? approvalResult.value?.pagination?.total ?? 0)
        : 0;
      const reschedules = rescheduleResult.status === 'fulfilled' && Array.isArray(rescheduleResult.value?.data)
        ? rescheduleResult.value.data.length
        : 0;
      setPendingCounts({
        enrollments: Number.isFinite(approvalTotal) ? approvalTotal : 0,
        rentals: rentals.filter((rental) => pendingRentalStatuses.includes(rental.status)).length,
        bookings: bookings.filter((booking) => booking.status === 'FOR_APPROVAL').length,
        billing: pendingBilling,
        reschedules,
      });
    });
    return () => { mounted = false; };
  }, []);

  const navItems = data.navMain.map((item) => ({
    ...item,
    badge: item.title === 'Enrollments' ? pendingCounts.enrollments : item.title === 'Rentals' ? pendingCounts.rentals : item.title === 'Room Bookings' ? pendingCounts.bookings : item.title === 'Billing & Payments' ? pendingCounts.billing : item.title === 'Class Schedule' ? pendingCounts.reschedules : undefined,
  }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="#" />}
            >
              <MusicIcon className="size-5!" />

              <span className="text-base font-semibold">
                Cadenza Music Center
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <NavMain
          items={navItems}
          activeClassName="!bg-blue-100 !text-blue-700 !font-semibold hover:!bg-blue-100 hover:!text-blue-700"
        />

      </SidebarContent>

      {/* User */}
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
