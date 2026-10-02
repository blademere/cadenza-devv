import { NavMain } from "@/pages/admin/components/nav-main";
import { NavUser } from "@/pages/admin/components/nav-user";

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
      title: "Instrument Rentals",
      url: "/front-desk/instrument-rentals",
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
        <NavMain items={data.navMain} />

      </SidebarContent>

      {/* User */}
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
