import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/pages/client/components/app-sidebar";
import { SiteHeader } from "@/pages/client/components/site-header";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ClientPageLayout() {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset className="min-w-0">
        <SiteHeader />

        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="flex flex-1 flex-col">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
