import { NavMain } from "@/pages/client/components/nav-main";
import { NavUser } from "@/pages/client/components/nav-user";

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
  ClipboardListIcon,
  CreditCardIcon,
  GuitarIcon,
  DoorOpenIcon,
  MusicIcon,
} from "lucide-react";

const data = {
  user: {
    name: "Client",
    email: "client@cadenzamusic.com",
    avatar: "/avatars/client.jpg",
  },

  navMain: [
    {
      title: "Dashboard",
      url: "/client",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Enrollments",
      url: "/client/enrollments",
      icon: <ClipboardListIcon />,
    },
    {
      title: "Room Bookings",
      url: "/client/room-bookings",
      icon: <DoorOpenIcon />,
    },
    {
      title: "Instrument Rentals",
      url: "/client/instrument-rentals",
      icon: <GuitarIcon />,
    },
    {
      title: "Billing & Payments",
      url: "/client/billing",
      icon: <CreditCardIcon />,
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
              render={<a href="/client" />}
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
