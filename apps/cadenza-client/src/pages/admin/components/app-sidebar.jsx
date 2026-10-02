import { NavMain } from "@/pages/admin/components/nav-main";
import { NavSecondary } from "@/pages/admin/components/nav-secondary";
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
  ClipboardCheckIcon,
  ClipboardListIcon,
  CreditCardIcon,
  GuitarIcon,
  FileChartColumnIcon,
  Settings2Icon,
  CircleHelpIcon,
  DoorOpenIcon,
  BadgeDollarSignIcon,
  UserCogIcon,
} from "lucide-react";

const data = {
  user: {
    name: "Admin",
    email: "admin@cadenzamusic.com",
    avatar: "/avatars/admin.jpg",
  },

  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Students",
      url: "/admin/students",
      icon: <GraduationCapIcon />,
    },
    {
      title: "Instructors",
      url: "/admin/instructors",
      icon: <UsersIcon />,
    },
    {
      title: "Courses",
      url: "/admin/courses",
      icon: <MusicIcon />,
    },
    {
      title: "Enrollments",
      url: "/admin/enrollments",
      icon: <ClipboardListIcon />,
    },
    {
      title: "Class Schedule",
      url: "/admin/schedule",
      icon: <CalendarDaysIcon />,
    },

    // Resources
    {
      title: "Rooms",
      url: "/admin/rooms",
      icon: <DoorOpenIcon />,
    },
    {
      title: "Room Rentals",
      url: "/admin/room-rentals",
      icon: <DoorOpenIcon />,
    },
    {
      title: "Instruments",
      url: "/admin/instruments",
      icon: <GuitarIcon />,
    },
    {
      title: "Instrument Rentals",
      url: "/admin/instrument-rentals",
      icon: <GuitarIcon />,
    },

    // Operations
    {
      title: "Enrollment Packages",
      url: "/admin/enrollment-rates",
      icon: <BadgeDollarSignIcon />,
    },

    // Administration
    {
      title: "User Management",
      url: "/admin/users",
      icon: <UserCogIcon />,
    },
    {
      title: "Reports",
      url: "/admin/reports",
      icon: <FileChartColumnIcon />,
    },
  ],

  navSecondary: [
    {
      title: "Settings",
      url: "/admin/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Help",
      url: "/admin/help",
      icon: <CircleHelpIcon />,
    },
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

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      {/* User */}
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
