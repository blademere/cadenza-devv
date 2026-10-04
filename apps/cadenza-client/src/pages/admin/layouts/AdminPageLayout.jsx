import { AppSidebar } from "@/features/admin/components/app-sidebar";
import { SiteHeader } from "@/features/admin/components/site-header";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function AdminPageLayout({
  title,
  description,
  children,
}) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader title={title} />

        <main className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col">
            <div className="flex flex-col gap-6 py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h1>

                {description && (
                  <p className="mt-1 text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>

              <div className="px-4 lg:px-6">
                {children}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
