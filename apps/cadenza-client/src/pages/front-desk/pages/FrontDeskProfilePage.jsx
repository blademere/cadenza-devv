import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ClientProfile } from '@/pages/client/profile';

export default function FrontDeskProfilePage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col">
          <ClientProfile showGuardian={false} staffProfile />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
